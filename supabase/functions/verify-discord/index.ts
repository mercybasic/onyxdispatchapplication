import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiscordGuildMember {
  roles: string[];
  user: {
    id: string;
    username: string;
    discriminator: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");

    if (!discordBotToken || !discordGuildId) {
      throw new Error("Discord configuration missing");
    }

    const discordUserId = user.user_metadata?.provider_id || user.user_metadata?.sub;
    const discordUsername = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

    if (!discordUserId) {
      throw new Error("Discord user ID not found in user metadata");
    }

    const guildMemberResponse = await fetch(
      `https://discord.com/api/guilds/${discordGuildId}/members/${discordUserId}`,
      {
        headers: {
          Authorization: `Bot ${discordBotToken}`,
        },
      }
    );

    if (!guildMemberResponse.ok) {
      if (guildMemberResponse.status === 404) {
        return new Response(
          JSON.stringify({
            verified: false,
            reason: "User is not a member of the required Discord server",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      throw new Error("Failed to fetch guild member info");
    }

    const guildMember: DiscordGuildMember = await guildMemberResponse.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("discord_id", user.id)
      .maybeSingle();

    if (!existingUser) {
      const { error: insertError } = await supabaseAdmin
        .from("users")
        .insert([{
          discord_id: user.id,
          discord_username: discordUsername || "Unknown User",
          role: "crew",
        }]);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        user: {
          id: discordUserId,
          username: discordUsername,
          roles: guildMember.roles,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        verified: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});