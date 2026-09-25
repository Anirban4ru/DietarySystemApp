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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all registered push tokens
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

    const pushMessages: any[] = [];
    let notifiedCount = 0;

    // 2. For each user, check items expiring in the next 48 hours
    for (const t of tokens) {
      const { data: expiringItems } = await supabase
        .from('inventory_items')
        .select('name, expires_at')
        .eq('user_id', t.user_id)
        .gte('expires_at', now.toISOString())
        .lte('expires_at', twoDaysLater.toISOString())
        .limit(5);

      if (expiringItems && expiringItems.length > 0) {
        const itemNames = expiringItems.map((i: any) => i.name).join(', ');
        const count = expiringItems.length;

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
        notifiedCount++;
      }
    }

    // 3. Dispatch to Expo Push API in batch
    if (pushMessages.length > 0) {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushMessages),
      });

      const expoData = await expoRes.json();
      console.log('Expo Push Response:', expoData);
    }

    return new Response(
      JSON.stringify({ success: true, notifiedCount, totalTokens: tokens.length }),
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
