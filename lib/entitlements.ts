/**
 * lib/entitlements.ts
 * Single source of truth for free vs. pro feature gating.
 *
 * Free tier is genuinely useful on its own.
 * Pro tier is a clear, meaningful step up — not an artificial paywall.
 *
 * This reads from the ProProvider (AsyncStorage-backed, per-user).
 * The subscription_tier column on user_profile is the server-side source;
 * the demo toggle flips only the local AsyncStorage flag for demonstration.
 */
import { useContext } from 'react';
import { ProContext } from './hooks';

export interface Entitlements {
  // AI features
  canUseAiChef:          boolean; // AI recipe generation from pantry
  canScanReceipts:       boolean; // Receipt OCR scanning
  canScanCamera:         boolean; // Live food camera detection

  // Pantry limits
  maxPantryItems:        number;  // -1 = unlimited
  maxShoppingListItems:  number;  // -1 = unlimited

  // Recipes
  maxSavedRecipes:       number;  // max favorited recipes
  canBrowseAllRecipes:   boolean; // browse full template catalog
  canSearchMeals:        boolean; // AI meal search by name

  // Meal plan
  canPlanMeals:          boolean; // basic meal planning
  hasUnlimitedMealPlanning: boolean; // unlimited days/entries

  // Analytics
  hasBasicImpactAnalytics:    boolean;
  hasAdvancedImpactAnalytics: boolean; // detailed CO₂ breakdown, charts

  // Notifications
  hasLocalReminders:           boolean; // local scheduled reminders (everyone)
  hasServerExpiryNotifications: boolean; // server-triggered expiry push alerts (pro)

  // Tier label
  tier: 'free' | 'pro';
}

/**
 * useEntitlements()
 * Returns the current user's full entitlement set based on their pro status.
 */
export function useEntitlements(): Entitlements {
  const { isPro } = useContext(ProContext);

  if (isPro) {
    return {
      // AI
      canUseAiChef:          true,
      canScanReceipts:       true,
      canScanCamera:         true,
      // Pantry
      maxPantryItems:        -1,
      maxShoppingListItems:  -1,
      // Recipes
      maxSavedRecipes:       -1,
      canBrowseAllRecipes:   true,
      canSearchMeals:        true,
      // Meal plan
      canPlanMeals:          true,
      hasUnlimitedMealPlanning: true,
      // Analytics
      hasBasicImpactAnalytics:    true,
      hasAdvancedImpactAnalytics: true,
      // Notifications
      hasLocalReminders:           true,
      hasServerExpiryNotifications: true,
      // Meta
      tier: 'pro',
    };
  }

  // Free tier — genuinely useful, honest limits
  return {
    // AI
    canUseAiChef:          false,
    canScanReceipts:       false,
    canScanCamera:         false,
    // Pantry (free users can add up to 20 items)
    maxPantryItems:        20,
    maxShoppingListItems:  15,
    // Recipes
    maxSavedRecipes:       5,
    canBrowseAllRecipes:   true,  // can browse pre-built recipes
    canSearchMeals:        false, // AI meal search is pro
    // Meal plan
    canPlanMeals:          true,
    hasUnlimitedMealPlanning: false, // limited to current week only
    // Analytics
    hasBasicImpactAnalytics:    true,
    hasAdvancedImpactAnalytics: false,
    // Notifications
    hasLocalReminders:           true,
    hasServerExpiryNotifications: false,
    // Meta
    tier: 'free',
  };
}

/**
 * Checks a single entitlement quickly.
 * Usage: const can = useEntitlement('canUseAiChef');
 */
export function useEntitlement<K extends keyof Entitlements>(key: K): Entitlements[K] {
  return useEntitlements()[key];
}
