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
    const { userId, discordId } = await req.json();

    if (!userId && !discordId) {
      throw new Error("Either userId or discordId is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");

    if (!discordBotToken || !discordGuildId) {
      throw new Error("Discord configuration missing");
    }

    let targetDiscordId = discordId;

    if (userId && !discordId) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("discord_id")
        .eq("id", userId)
        .maybeSingle();

      if (!userData?.discord_id) {
        throw new Error("User not found or Discord ID missing");
      }

      targetDiscordId = userData.discord_id;
    }

    const guildMemberResponse = await fetch(
      `https://discord.com/api/guilds/${discordGuildId}/members/${targetDiscordId}`,
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
            success: false,
            reason: "User is not a member of the required Discord server",
          }),
          {
            status: 404,
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

    const { data: roleMappings } = await supabaseAdmin
      .from("discord_role_mappings")
      .select("*");

    if (!roleMappings || roleMappings.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "No role mappings configured",
          userRoles: guildMember.roles,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const userRoleMappings = (roleMappings as RoleMapping[]).filter((mapping) =>
      guildMember.roles.includes(mapping.discord_role_id)
    );

    if (userRoleMappings.length === 0) {
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          role: "staff",
          verified: false,
        })
        .eq("discord_id", targetDiscordId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          success: true,
          assigned_role: "staff",
          verified: false,
          reason: "No matching Discord roles found, assigned as staff",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const highestPriorityRole = userRoleMappings.reduce((highest, current) => {
      const priority = { dispatcher: 3, administrator: 2, staff: 1 };
      const currentPriority = priority[current.system_role as keyof typeof priority] || 0;
      const highestPriority = priority[highest.system_role as keyof typeof priority] || 0;
      return currentPriority > highestPriority ? current : highest;
    });

    const shouldAutoVerify = highestPriorityRole.auto_verify;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        role: highestPriorityRole.system_role,
        verified: shouldAutoVerify,
      })
      .eq("discord_id", targetDiscordId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        assigned_role: highestPriorityRole.system_role,
        verified: shouldAutoVerify,
        discord_role: highestPriorityRole.discord_role_name,
        matched_roles: userRoleMappings.map(r => r.discord_role_name),
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