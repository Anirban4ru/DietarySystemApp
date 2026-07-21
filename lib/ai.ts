export async function generateStrictRecipe(inventoryItems: { name: string, quantity: number, unit: string }[]): Promise<any> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('API Key missing');

  const promptText = `
You are "Chef Nourish", a slightly sassy, highly encouraging Michelin Star Chef. 
I have the following exact ingredients in my pantry:
${inventoryItems.map(i => `- ${i.quantity} ${i.unit} ${i.name}`).join('\n')}

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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
      }),
  });

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini API Error Response:", data);
      throw new Error(data.error?.message || "No candidates returned from Gemini");
  }

  const text = data.candidates[0].content.parts[0].text;
  const cleanJson = text.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", cleanJson);
    throw new Error("AI returned invalid data format.");
  }
}

// Search for a meal/recipe by name using AI — returns full recipe details
export async function searchMealByName(mealName: string): Promise<{
  name: string;
  ingredients: { name: string; grams: number }[];
  instructions: string[];
  nutrition: { kcal: number; proteinG: number; carbG: number; fatG: number; fiberG: number; iron: number };
}> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('API Key missing');

  const promptText = `
You are "Chef Nourish", a world-class chef. Give me a detailed, mouth-watering recipe for "${mealName}" — preferably an Indian or popular home-cooked version.
Make the name sound delicious. Accurately estimate the nutritional macros for the total meal.

Return ONLY this JSON (no markdown, no explanation):
{
  "name": "Proper Recipe Name",
  "ingredients": [{"name": "Ingredient", "grams": 100}],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "nutrition": {"kcal": 400, "proteinG": 15, "carbG": 50, "fatG": 10, "fiberG": 5, "iron": 3}
}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    }),
  });

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const cleanJson = text.replace(/```json|```/gi, '').trim();
  return JSON.parse(cleanJson);
}

// Get meal name suggestions
export async function searchMealSuggestions(query: string): Promise<string[]> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return [];
  const promptText = `User typed: "${query}". Return a JSON list of 4 meal/recipe names that match this (e.g. Indian or healthy meals). Return ONLY valid JSON array of strings, e.g. ["Chicken Curry", "Chicken Salad"].`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    }),
  });
  const data = await response.json();
  if (!data.candidates) return [];
  try {
    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return [];
  }
}

// Get rich food tip insights
export async function getTipInsight(foodName: string, daysRemaining: number): Promise<{
  recipes: string[];
  freshness: string;
  calories: string;
}> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { recipes: [], freshness: '', calories: '' };
  const promptText = `Provide tips for a user who has "${foodName}" with roughly ${daysRemaining} days of freshness left.
Return ONLY a valid JSON object matching this schema:
{
  "recipes": ["Recipe 1", "Recipe 2"], // 2 recipe ideas to use it up
  "freshness": "A short 1-sentence tip about its current freshness condition and how to store it.",
  "calories": "Estimated calories per 100g."
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    }),
  });
  const data = await response.json();
  if (!data.candidates) return { recipes: [], freshness: '', calories: '' };
  try {
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch {
    return { recipes: [], freshness: '', calories: '' };
  }
}

// Search for food/grocery items using AI
export async function searchGroceryItems(query: string): Promise<{
  items: { name: string; category: string; emoji: string }[];
}> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('API Key missing');

  const promptText = `
The user is searching for grocery items with the query: "${query}"

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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    }),
  });

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) return { items: [] };
  try {
    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return { items: [] };
  }
}

export async function parseReceipt(base64Image: string): Promise<any> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('API Key missing');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Analyze this grocery receipt. Extract the food items and their quantities. Return the result in JSON: {\"items\": [{\"name\": \"Food name\", \"quantity\": 1}]} . Focus ONLY on food items. If no quantity is specified, assume 1. Return ONLY valid JSON." },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  const data = await response.json();
  if (!data.candidates) throw new Error("No items detected on receipt.");
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

// Parse natural language dictation into pantry items
export async function parseNaturalLanguagePantry(text: string): Promise<{name: string, quantity: number, unit: string}[]> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return [];
  const promptText = `
The user dictated the following groceries: "${text}"
Parse this into a strict JSON list of items with name, quantity, and unit.
Return ONLY valid JSON array:
[{"name": "Apple", "quantity": 3, "unit": "unit"}, {"name": "Milk", "quantity": 1, "unit": "gallon"}]
`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    }),
  });
  const data = await response.json();
  if (!data.candidates) return [];
  try {
    const cleanJson = data.candidates[0].content.parts[0].text.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return [];
  }
}
