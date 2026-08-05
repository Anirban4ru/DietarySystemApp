import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
You are "Chef Nourish", a slightly sassy, highly encouraging Michelin Star Chef. 
I have the following exact ingredients in my pantry:
${items.map((i: any) => `- ${i.quantity} ${i.unit} ${i.name}`).join('\n')}

Generate a creative, mouth-watering recipe that strictly uses ONLY these ingredients. Do not require any other ingredients (basic staples like water, salt, oil, and pepper are okay).
If the ingredients are too few or weird, use your culinary genius to combine them into something surprisingly delicious.
In the recipe name, include a fun, sassy, or encouraging comment from the Chef (e.g. "Chef's Scrappy Egg Toss" or "Gordon's Desperate Pantry Pasta").
Accurately estimate the nutritional macros for the total meal.

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
You are "Chef Nourish", a world-class chef. Give me a detailed, mouth-watering recipe for "${payload.mealName}" — preferably an Indian or popular home-cooked version.
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
        promptText = `User typed: "${payload.query}". Return a JSON list of 4 meal/recipe names that match this (e.g. Indian or healthy meals). Return ONLY valid JSON array of strings, e.g. ["Chicken Curry", "Chicken Salad"].`;
        break;
      }
      case 'getTipInsight': {
        promptText = `Provide tips for a user who has "${payload.foodName}" with roughly ${payload.daysRemaining} days of freshness left.
Return ONLY a valid JSON object matching this schema:
{
  "recipes": ["Recipe 1", "Recipe 2"], // 2 recipe ideas to use it up
  "freshness": "A short 1-sentence tip about its current freshness condition and how to store it.",
  "calories": "Estimated calories per 100g."
}`;
        break;
      }
      case 'searchGroceryItems': {
        promptText = `
The user is searching for grocery items with the query: "${payload.query}"

Return a list of up to 8 relevant grocery/food items (Indian and international) matching that search.

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
[{"name": "Apple", "quantity": 3, "unit": "unit"}, {"name": "Milk", "quantity": 1, "unit": "gallon"}]
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

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
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
