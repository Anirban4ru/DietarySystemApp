// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // ── 2. Parse request payload ──────────────────────────────────────────
    const body = await req.json();
    const { platform, productId, purchaseToken, plan = 'annual' } = body;

    if (!platform || !productId || !purchaseToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: platform, productId, purchaseToken' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ── 3. Feature flag & Store Verification ───────────────────────────────
    // Ground Rule 7: Keep live money operations behind a feature flag until verified by human
    const enableRealPurchases = Deno.env.get('ENABLE_REAL_PURCHASES') === 'true';
    const storeVerificationSecret = Deno.env.get('STORE_VERIFICATION_SECRET');

    let isVerified = false;
    let verificationProvider = 'unverified';

    if (!enableRealPurchases) {
      // Feature flag is disabled: real money transactions are intentionally blocked
      // Allow sandbox verification only if explicit test sandbox token is passed
      if (purchaseToken.startsWith('sandbox_test_token_')) {
        isVerified = true;
        verificationProvider = 'sandbox_testing';
      } else {
        return new Response(
          JSON.stringify({
            error: 'In-app subscriptions are currently disabled by feature flag ENABLE_REAL_PURCHASES pending production store credentials.',
            code: 'FEATURE_FLAG_DISABLED',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    } else {
      // Real purchase verification mode:
      // Verify with Google Play Developer API / App Store Server API / RevenueCat
      if (!storeVerificationSecret) {
        return new Response(
          JSON.stringify({
            error: 'Server verification secret (STORE_VERIFICATION_SECRET) is not configured in environment.',
            code: 'MISSING_STORE_SECRET',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Perform store verification call (e.g. RevenueCat or direct Google Play/StoreKit)
      // For RevenueCat REST API:
      // GET https://api.revenuecat.com/v1/subscribers/{app_user_id}
      try {
        const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${user.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storeVerificationSecret}`,
            'X-Platform': platform === 'android' ? 'play_store' : 'stripe',
          },
        });

        if (rcRes.ok) {
          const rcData = await rcRes.json();
          const entitlements = rcData?.subscriber?.entitlements || {};
          const proEntitlement = entitlements['pro'] || entitlements['Nourish Pro'];
          if (proEntitlement && (proEntitlement.expires_date === null || new Date(proEntitlement.expires_date) > new Date())) {
            isVerified = true;
            verificationProvider = 'revenuecat';
          }
        }
      } catch (_e) {
        isVerified = false;
      }

      if (!isVerified) {
        return new Response(
          JSON.stringify({ error: 'Purchase verification failed with store provider.', code: 'INVALID_RECEIPT' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
    }

    if (!isVerified) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify purchase token.', code: 'VERIFICATION_FAILED' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ── 4. Elevated update to user_profile (via Service Role) ───────────────
    // Service role bypasses the protect_user_subscription_tier trigger
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({ subscription_tier: 'pro' })
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update subscription tier: ${updateError.message}`);
    }

    // ── 5. Audit record in subscription_events ────────────────────────────
    await supabase.from('subscription_events').insert({
      user_id: user.id,
      platform,
      product_id: productId,
      purchase_token: purchaseToken,
      status: 'verified',
      metadata: {
        plan,
        provider: verificationProvider,
        verified_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionTier: 'pro',
        plan,
        provider: verificationProvider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
