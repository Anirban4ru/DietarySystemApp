import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecipeCandidate } from './optimizer';
import { supabase } from './supabase';

const VAULT_KEY = '@nourish_vault';

export async function getVaultRecipes(): Promise<RecipeCandidate[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('recipe_json')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const remoteRecipes = data.map((row: any) => row.recipe_json as RecipeCandidate);
        await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(remoteRecipes));
        return remoteRecipes;
      }
    }
    
    const json = await AsyncStorage.getItem(VAULT_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to get vault:', e);
    return [];
  }
}

export async function saveRecipeToVault(recipe: RecipeCandidate) {
  try {
    const current = await getVaultRecipes();
    if (current.some(r => r.name === recipe.name)) return;
    
    const updated = [recipe, ...current];
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('saved_recipes').insert({
        name: recipe.name,
        recipe_json: recipe
      });
    }
  } catch (e) {
    console.error('Failed to save to vault:', e);
  }
}

export async function removeRecipeFromVault(name: string) {
  try {
    const current = await getVaultRecipes();
    const updated = current.filter(r => r.name !== name);
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('saved_recipes').delete().eq('name', name);
    }
  } catch (e) {
    console.error('Failed to remove from vault:', e);
  }
}
