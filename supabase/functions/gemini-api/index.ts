import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiter with tier-based thresholds:
// Free tier: 5 requests / hour | Pro tier: 30 requests / hour
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const FREE_RATE_LIMIT = 5;
const PRO_RATE_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Pro-only actions mapping to Entitlements:
// canUseAiChef -> generateStrictRecipe
// canScanReceipts -> parseReceipt
// canScanCamera -> detectFoodItem
// canSearchMeals -> searchMealByName, searchMealSuggestions
const PRO_ONLY_ACTIONS = new Set([
  'generateStrictRecipe',
  'parseReceipt',
  'detectFoodItem',
  'searchMealByName',
  'searchMealSuggestions',
]);

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

    // ── 2. Entitlement & Subscription Verification ────────────────────────
    const { data: profile } = await supabase
      .from('user_profile')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPro = profile?.subscription_tier === 'pro';

    // ── 3. Parse action and payload ───────────────────────────────────────
    const { action, payload } = await req.json();

    // Enforce Pro-only actions server-side
    if (PRO_ONLY_ACTIONS.has(action) && !isPro) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: This feature requires an active Nourish Pro subscription.',
          code: 'PRO_SUBSCRIPTION_REQUIRED',
          action,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // ── 4. Tiered Rate Limiting ───────────────────────────────────────────
    const limit = isPro ? PRO_RATE_LIMIT : FREE_RATE_LIMIT;
    if (!checkRateLimit(user.id, limit)) {
      return new Response(
        JSON.stringify({
          error: isPro
            ? `Pro hourly limit reached (${PRO_RATE_LIMIT} calls/hr). Please try again shortly.`
            : `Free tier limit reached (${FREE_RATE_LIMIT} calls/hr). Upgrade to Nourish Pro for 30 calls/hr.`,
          code: 'RATE_LIMIT_EXCEEDED',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }
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
