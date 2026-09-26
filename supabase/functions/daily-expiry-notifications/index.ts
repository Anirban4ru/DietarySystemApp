// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Authentication via Shared Secret Header ────────────────────────
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret') 
      || req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!cronSecret || providedSecret !== cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid CRON_SECRET header.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 2. Fetch all registered push tokens ───────────────────────────────
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('user_id, token');

    if (tokenError) {
      throw new Error(`Failed to query push_tokens: ${tokenError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No registered push tokens found', notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const userIds = [...new Set(tokens.map((t) => t.user_id))];

    // ── 3. Single Batched Query Across All Users (Replaces per-user loop) ──
    const { data: allExpiringItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select('user_id, name, expires_at')
      .in('user_id', userIds)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', twoDaysLater.toISOString())
      .order('expires_at', { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to query expiring inventory_items: ${itemsError.message}`);
    }

    // Group items by user in memory (max 5 items per user summary)
    const itemsByUser = new Map<string, string[]>();
    for (const item of allExpiringItems || []) {
      const existing = itemsByUser.get(item.user_id) || [];
      if (existing.length < 5) {
        existing.push(item.name);
        itemsByUser.set(item.user_id, existing);
      }
    }

    // ── 4. Build Push Notification Messages ───────────────────────────────
    const pushMessages: any[] = [];
    let notifiedUsersCount = 0;

    for (const t of tokens) {
      const expiringList = itemsByUser.get(t.user_id);
      if (expiringList && expiringList.length > 0) {
        const itemNames = expiringList.join(', ');
        const count = expiringList.length;

        pushMessages.push({
          to: t.token,
          sound: 'default',
          title: '🍃 Freshness Watch: Items Expiring Soon',
          body: count === 1
            ? `${itemNames} will expire soon! Tap to see quick rescue recipes.`
            : `${itemNames} are expiring soon! Tap to rescue them today.`,
          data: { url: '/(tabs)/recipes' },
          priority: 'high',
        });
        notifiedUsersCount++;
      }
    }

    // ── 5. Feature Flag Gate for Live Push Notifications ───────────────────
    // Ground Rule 7: Implement fully but leave disabled behind a feature flag until tested
    const enablePush = Deno.env.get('ENABLE_PUSH_NOTIFICATIONS') === 'true';

    if (pushMessages.length > 0 && enablePush) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushMessages),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifiedUsersCount,
        totalTokens: tokens.length,
        messagesPrepared: pushMessages.length,
        pushDispatched: enablePush,
        mode: enablePush ? 'live' : 'feature_flag_disabled (dry-run)',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error('Daily expiry notification function failed:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
