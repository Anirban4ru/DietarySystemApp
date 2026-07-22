import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecipeCandidate } from './optimizer';

const VAULT_KEY = '@nourish_vault';

export async function getVaultRecipes(): Promise<RecipeCandidate[]> {
  try {
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
    // avoid duplicates by name
    if (current.some(r => r.name === recipe.name)) return;
    const updated = [recipe, ...current];
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save to vault:', e);
  }
}

export async function removeRecipeFromVault(name: string) {
  try {
    const current = await getVaultRecipes();
    const updated = current.filter(r => r.name !== name);
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove from vault:', e);
  }
}
