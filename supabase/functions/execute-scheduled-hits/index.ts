import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date().toISOString();

    // Get all active scheduled hits where start_time has passed and it's time to execute
    const { data: dueHits, error: fetchError } = await supabase
      .from('scheduled_hits')
      .select('*')
      .eq('is_active', true)
      .lte('start_time', now)
      .or(`next_execution_at.is.null,next_execution_at.lte.${now}`);

    if (fetchError) {
      console.error('Error fetching scheduled hits:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dueHits || dueHits.length === 0) {
      return new Response(JSON.stringify({ message: 'No due hits', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${dueHits.length} scheduled hits`);

    // Get all enabled APIs from hit_apis table
    const { data: apis, error: apiError } = await supabase
      .from('hit_apis')
      .select('*')
      .eq('enabled', true);

    if (apiError || !apis || apis.length === 0) {
      console.log('No enabled APIs found');
      return new Response(JSON.stringify({ message: 'No enabled APIs', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    let totalProcessed = 0;

    for (const hit of dueHits) {
      const phone = hit.phone_number;

      // Fire all APIs for this phone number via hit-api edge function
      const results = await Promise.allSettled(
        apis.map(async (api: any) => {
          // Replace {PHONE} placeholders
          const finalUrl = api.url.replace(/\{PHONE\}/gi, phone);
          const finalHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(api.headers as Record<string, string>)) {
            finalHeaders[k.replace(/\{PHONE\}/gi, phone)] = (v as string).replace(/\{PHONE\}/gi, phone);
          }

          let finalBody: any = undefined;
          if (api.body && Object.keys(api.body).length > 0) {
            finalBody = JSON.parse(JSON.stringify(api.body).replace(/\{PHONE\}/gi, phone));
          }

          let urlWithParams = finalUrl;
          if (api.query_params && Object.keys(api.query_params).length > 0) {
            try {
              const url = new URL(finalUrl);
              for (const [k, v] of Object.entries(api.query_params as Record<string, string>)) {
                url.searchParams.set(k.replace(/\{PHONE\}/gi, phone), (v as string).replace(/\{PHONE\}/gi, phone));
              }
              urlWithParams = url.toString();
            } catch {}
          }

          // Call hit-api edge function
          const res = await fetch(`${supabaseUrl}/functions/v1/hit-api`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              url: urlWithParams,
              method: api.method,
              headers: finalHeaders,
              body: finalBody,
              bodyType: api.body_type,
              uaRotation: true,
            }),
          });
          await res.text(); // drain
          return { api: api.name, status: res.status };
        })
      );

      // Calculate next execution time
      const newTotal = (hit.total_hits || 0) + 1;
      const maxRounds = hit.max_rounds || 0;
      const reachedLimit = maxRounds > 0 && newTotal >= maxRounds;
      const nextExec = reachedLimit ? null : new Date(Date.now() + hit.interval_seconds * 1000).toISOString();

      // Update the scheduled hit record (auto-deactivate if limit reached)
      await supabase
        .from('scheduled_hits')
        .update({
          last_executed_at: now,
          next_execution_at: nextExec,
          total_hits: newTotal,
          is_active: reachedLimit ? false : hit.is_active,
        })
        .eq('id', hit.id);

      if (reachedLimit) {
        console.log(`Hit ${hit.id} reached max rounds (${maxRounds}), deactivated.`);
      }

      // Log to search_history
      await supabase.from('search_history').insert({
        search_type: 'scheduled_hit',
        search_query: phone,
      });

      totalProcessed++;
      console.log(`Processed hit for ${phone}, next at ${nextExec}`);
    }

    return new Response(JSON.stringify({ 
      message: 'Scheduled hits processed', 
      processed: totalProcessed,
      apis_count: apis.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in execute-scheduled-hits:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
