import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiscordMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  roles: string[];
  nick: string | null;
}

interface RoleMapping {
  discord_role_id: string;
  discord_role_name: string;
  system_role: string;
  auto_verify: boolean;
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

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["ceo", "administrator", "dispatcher"].includes(profile.role)) {
      throw new Error("Insufficient permissions");
    }

    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");

    if (!discordBotToken || !discordGuildId) {
      throw new Error("Discord configuration missing");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: roleMappings } = await supabaseAdmin
      .from("discord_role_mappings")
      .select("*");

    const mappings = (roleMappings || []) as RoleMapping[];

    let allMembers: DiscordMember[] = [];
    let after: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const url = after
        ? `https://discord.com/api/guilds/${discordGuildId}/members?limit=1000&after=${after}`
        : `https://discord.com/api/guilds/${discordGuildId}/members?limit=1000`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bot ${discordBotToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Failed to fetch guild members: ${response.status} ${response.statusText}`;

        if (response.status === 403) {
          errorMessage = `Discord API returned 403 Forbidden. Please ensure your Discord bot has:
1. The "Server Members Intent" enabled in Discord Developer Portal
2. Been invited to the server with proper permissions
3. Has the correct bot token configured in Supabase secrets

Error details: ${errorBody}`;
        }

        throw new Error(errorMessage);
      }

      const members: DiscordMember[] = await response.json();

      if (members.length === 0) {
        hasMore = false;
      } else {
        allMembers = allMembers.concat(members);
        after = members[members.length - 1].user.id;

        if (members.length < 1000) {
          hasMore = false;
        }
      }
    }

    const results = {
      total: allMembers.length,
      synced: 0,
      updated: 0,
      created: 0,
      errors: [] as string[],
    };

    for (const member of allMembers) {
      try {
        const discordId = member.user.id;
        const username = member.nick || member.user.username;

        const userRoleMappings = mappings.filter((mapping) =>
          member.roles.includes(mapping.discord_role_id)
        );

        let systemRole = "crew";
        let shouldVerify = false;

        if (userRoleMappings.length > 0) {
          const highestPriorityRole = userRoleMappings.reduce((highest, current) => {
            const priority = { ceo: 4, administrator: 3, dispatcher: 2, staff: 1 };
            const currentPriority = priority[current.system_role as keyof typeof priority] || 0;
            const highestPriority = priority[highest.system_role as keyof typeof priority] || 0;
            return currentPriority > highestPriority ? current : highest;
          });

          systemRole = highestPriorityRole.system_role;
          shouldVerify = highestPriorityRole.auto_verify;
        }

        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("discord_id", discordId)
          .maybeSingle();

        if (existingUser) {
          const { error: updateError } = await supabaseAdmin
            .from("users")
            .update({
              discord_username: username,
              role: systemRole,
              verified: shouldVerify,
            })
            .eq("discord_id", discordId);

          if (updateError) {
            results.errors.push(`Failed to update ${username}: ${updateError.message}`);
          } else {
            results.updated++;
          }
        } else {
          const { error: insertError } = await supabaseAdmin
            .from("users")
            .insert([{
              discord_id: discordId,
              discord_username: username,
              role: systemRole,
              verified: shouldVerify,
            }]);

          if (insertError) {
            if (insertError.code === '23505') {
              results.errors.push(`Duplicate discord_id for ${username}, skipping`);
            } else {
              results.errors.push(`Failed to create ${username}: ${insertError.message}`);
            }
          } else {
            results.created++;
          }
        }

        results.synced++;
      } catch (error) {
        results.errors.push(`Error processing member: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify(results),
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
        success: false,
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