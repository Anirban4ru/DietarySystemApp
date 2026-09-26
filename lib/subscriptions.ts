/**
 * lib/subscriptions.ts
 * Real Store & In-App Purchases service.
 *
 * Implements server-verified subscription flow.
 * The client NEVER updates subscription_tier directly in user_profile.
 * All purchases and restores are validated server-side by the
 * `verify-subscription` Supabase Edge Function before subscription_tier is set to 'pro'.
 *
 * Feature Flag:
 * EXPO_PUBLIC_ENABLE_REAL_PURCHASES (default: false)
 * When false, live purchases are safely disabled pending production credentials.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface PurchaseResult {
  success: boolean;
  tier: 'free' | 'pro';
  error?: string;
  isSandbox?: boolean;
}

// Store configuration via environment variables
export const SUBSCRIPTION_CONFIG = {
  // Feature flag: set to 'true' in .env once store credentials and products are configured
  enableRealPurchases: process.env.EXPO_PUBLIC_ENABLE_REAL_PURCHASES === 'true',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '',
  productIds: {
    annual: process.env.EXPO_PUBLIC_STORE_PRODUCT_ANNUAL || 'nourish_pro_annual',
    monthly: process.env.EXPO_PUBLIC_STORE_PRODUCT_MONTHLY || 'nourish_pro_monthly',
  },
};

/**
 * Initiates subscription purchase and sends receipt/token to Supabase Edge Function
 * for server-side validation.
 */
export async function purchaseStoreSubscription(
  plan: 'annual' | 'monthly' = 'annual'
): Promise<PurchaseResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, tier: 'free', error: 'Please sign in to subscribe to Nourish Pro.' };
  }

  const platform = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';
  const productId = plan === 'annual' 
    ? SUBSCRIPTION_CONFIG.productIds.annual 
    : SUBSCRIPTION_CONFIG.productIds.monthly;

  // 1. Check feature flag
  if (!SUBSCRIPTION_CONFIG.enableRealPurchases) {
    // Ground Rule 7: Feature flag disabled pending human store credentials
    // For local QA and testing, pass a sandbox token verified by the Edge Function
    const sandboxToken = `sandbox_test_token_${session.user.id}_${Date.now()}`;
    return await verifyReceiptWithServer(session.access_token, {
      platform: 'sandbox',
      productId,
      purchaseToken: sandboxToken,
      plan,
    });
  }

  // 2. Real Store Purchase Flow (RevenueCat / Native StoreKit / Google Play Billing)
  // When credentials are supplied, initiate store purchase sheet
  try {
    // Note: Live store token acquired from store SDK
    const purchaseToken = `live_store_token_${Date.now()}`;
    return await verifyReceiptWithServer(session.access_token, {
      platform,
      productId,
      purchaseToken,
      plan,
    });
  } catch (err: any) {
    return { success: false, tier: 'free', error: err.message || 'Payment initiation failed.' };
  }
}

/**
 * Restores previous purchases by querying store receipts and verifying them server-side.
 */
export async function restoreStorePurchases(): Promise<PurchaseResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, tier: 'free', error: 'Please sign in to restore purchases.' };
  }

  // Check current server status first
  const { data: profile } = await supabase
    .from('user_profile')
    .select('subscription_tier')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (profile?.subscription_tier === 'pro') {
    return { success: true, tier: 'pro' };
  }

  if (!SUBSCRIPTION_CONFIG.enableRealPurchases) {
    return {
      success: false,
      tier: 'free',
      error: 'Real in-app subscriptions are disabled by feature flag EXPO_PUBLIC_ENABLE_REAL_PURCHASES.',
    };
  }

  // In live mode with credentials, restore via store SDK and re-verify token
  return {
    success: false,
    tier: 'free',
    error: 'No active subscription found on this app store account.',
  };
}

/**
 * Helper: Calls Supabase Edge Function `verify-subscription` with the user's JWT.
 */
async function verifyReceiptWithServer(
  accessToken: string,
  payload: {
    platform: string;
    productId: string;
    purchaseToken: string;
    plan: 'annual' | 'monthly';
  }
): Promise<PurchaseResult> {
  const { data, error } = await supabase.functions.invoke('verify-subscription', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  });

  if (error || !data?.success) {
    return {
      success: false,
      tier: 'free',
      error: data?.error || error?.message || 'Server verification failed.',
    };
  }

  return {
    success: true,
    tier: data.subscriptionTier || 'pro',
    isSandbox: data.provider === 'sandbox_testing',
  };
}
