import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecipeCandidate } from './optimizer';
import { supabase } from './supabase';

const getVaultKey = (userId?: string | null) =>
  userId ? `@nourish_vault_${userId}` : '@nourish_vault_anon';

export async function getVaultRecipes(): Promise<RecipeCandidate[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const vaultKey = getVaultKey(user?.id);

    if (user) {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('recipe_json')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const remoteRecipes = data.map((row: any) => row.recipe_json as RecipeCandidate);
        await AsyncStorage.setItem(vaultKey, JSON.stringify(remoteRecipes));
        return remoteRecipes;
      }
    }

    const json = await AsyncStorage.getItem(vaultKey);
    if (!json) return [];
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to get vault:', e);
    return [];
  }
}

export async function saveRecipeToVault(recipe: RecipeCandidate): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const vaultKey = getVaultKey(user?.id);
    const current = await getVaultRecipes();
    if (current.some((r) => r.name === recipe.name)) return { success: true };

    const updated = [recipe, ...current];
    await AsyncStorage.setItem(vaultKey, JSON.stringify(updated));

    if (user) {
      const { error } = await supabase.from('saved_recipes').insert({
        user_id: user.id,
        name: recipe.name,
        recipe_json: recipe,
      });
      if (error) {
        console.warn('Vault remote save error:', error.message);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Failed to save to vault:', e);
    return { success: false, error: e?.message || 'Failed to save recipe' };
  }
}

export async function removeRecipeFromVault(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const vaultKey = getVaultKey(user?.id);
    const current = await getVaultRecipes();
    const updated = current.filter((r) => r.name !== name);
    await AsyncStorage.setItem(vaultKey, JSON.stringify(updated));

    if (user) {
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('user_id', user.id)
        .eq('name', name);
      if (error) {
        console.warn('Vault remote delete error:', error.message);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Failed to remove from vault:', e);
    return { success: false, error: e?.message || 'Failed to remove recipe' };
  }
}

