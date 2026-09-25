import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limit: max 20 AI calls per user per hour
// Resets when the Edge Function instance is recycled (Supabase free tier recycles frequently).
// For a more persistent limit, use a Supabase table — good enough for a demo.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Auth verification ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // ── 2. Rate limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    // ── 3. Process the AI action ──────────────────────────────────────────
    const { action, payload } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in edge function environment');
    }

    let promptText = '';
    let isImage = false;
    let base64Image = '';

    switch (action) {
      case 'generateStrictRecipe': {
        const items = payload.inventoryItems as { name: string, quantity: number, unit: string }[];
        promptText = `
You are "Chef Nourish", a slightly sassy, highly encouraging Indian home chef who loves wholesome, delicious food.
I have the following exact ingredients in my pantry:
${items.map((i: any) => `- ${i.quantity} ${i.unit} ${i.name}`).join('\n')}

Generate a creative, mouth-watering recipe (preferably Indian) that strictly uses ONLY these ingredients. Basic staples (water, salt, oil, jeera, haldi, mirch) are allowed.
If the ingredients are too few, combine them into something surprisingly delicious.
Include a fun sassy chef comment in the name (e.g. "Chef's Scrappy Dal Tadka").
Accurately estimate nutritional macros for the total meal.

Return the result strictly in this JSON format:
{
  "name": "Recipe Name",
  "ingredients": [{"name": "Ingredient Name", "grams": 100}],
  "instructions": ["Step 1", "Step 2"],
  "nutrition": {"kcal": 400, "proteinG": 10, "carbG": 30, "fatG": 10, "fiberG": 5, "iron": 2}
}
Return ONLY valid JSON. Do not include markdown codeblocks around the output.
`;
        break;
      }
      case 'searchMealByName': {
        promptText = `
You are "Chef Nourish", a world-class Indian and international chef. Give me a detailed, mouth-watering recipe for "${payload.mealName}" — preferably an Indian or popular home-cooked version.
Make the name sound delicious. Accurately estimate the nutritional macros for the total meal.

Return ONLY this JSON (no markdown, no explanation):
{
  "name": "Proper Recipe Name",
  "ingredients": [{"name": "Ingredient", "grams": 100}],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "nutrition": {"kcal": 400, "proteinG": 15, "carbG": 50, "fatG": 10, "fiberG": 5, "iron": 3}
}
`;
        break;
      }
      case 'searchMealSuggestions': {
        promptText = `User typed: "${payload.query}". Return a JSON list of 4 meal/recipe names that match this (prefer Indian or healthy meals). Return ONLY valid JSON array of strings, e.g. ["Chicken Curry", "Chicken Tikka"].`;
        break;
      }
      case 'getTipInsight': {
        promptText = `Provide tips for a user who has "${payload.foodName}" with roughly ${payload.daysRemaining} days of freshness left.
Return ONLY a valid JSON object matching this schema:
{
  "recipes": ["Recipe 1", "Recipe 2"],
  "freshness": "A short 1-sentence tip about its current freshness condition and how to store it.",
  "calories": "Estimated calories per 100g."
}`;
        break;
      }
      case 'searchGroceryItems': {
        promptText = `
The user is searching for grocery items with the query: "${payload.query}"

Return a list of up to 8 relevant grocery/food items (preferably Indian and common) matching that search.

Return ONLY this JSON:
{
  "items": [
    {"name": "Item Name", "category": "vegetable", "emoji": "🥦"},
    {"name": "Item Name", "category": "dairy", "emoji": "🧀"}
  ]
}
Categories must be one of: vegetable, fruit, protein, dairy, grain, legume, spice, oil, other
Return ONLY valid JSON.
`;
        break;
      }
      case 'parseReceipt': {
        isImage = true;
        base64Image = payload.base64Image;
        promptText = "Analyze this grocery receipt. Extract the food items and their quantities. Return the result in JSON: {\"items\": [{\"name\": \"Food name\", \"quantity\": 1}]} . Focus ONLY on food items. If no quantity is specified, assume 1. Return ONLY valid JSON.";
        break;
      }
      case 'parseNaturalLanguagePantry': {
        promptText = `
The user dictated the following groceries: "${payload.text}"
Parse this into a strict JSON list of items with name, quantity, and unit.
Return ONLY valid JSON array:
[{"name": "Aloo", "quantity": 3, "unit": "unit"}, {"name": "Doodh", "quantity": 1, "unit": "liter"}]
`;
        break;
      }
      case 'detectFoodItem': {
        isImage = true;
        base64Image = payload.base64Image;
        promptText = `
Identify the main food item in this image. Estimate its freshness (0.0 to 1.0, where 1.0 is perfectly fresh and 0.0 is spoiled).
Also provide a confidence score (0.0 to 1.0).
Return ONLY this JSON format:
{
  "name": "Food Name",
  "freshness": 0.95,
  "confidence": 0.88
}
`;
        break;
      }
      default:
        throw new Error('Invalid action: ' + action);
    }

    const contents = isImage 
      ? [{ parts: [{ text: promptText }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }]
      : [{ parts: [{ text: promptText }] }];

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const data = await geminiRes.json();
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini API Error Response:", data);
      throw new Error(data.error?.message || "No candidates returned from Gemini");
    }

    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json|```/gi, '').trim();
    
    return new Response(JSON.stringify({ data: cleanJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
