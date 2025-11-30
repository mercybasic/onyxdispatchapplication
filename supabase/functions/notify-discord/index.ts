import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ServiceRequestPayload {
  client_name: string;
  client_discord: string;
  service_type: string;
  system: string;
  system_code: string;
  location_details: string;
  description?: string;
  tracking_code: string;
  site_url: string;
}

interface ContractPayload {
  contract_title: string;
  contract_type: string;
  created_by: string;
  location: string;
  target_payout: number;
  description?: string;
  site_url: string;
}

interface ContractParticipantPayload {
  contract_title: string;
  participant_name: string;
  participant_role: string;
  action: 'joined' | 'added';
  added_by?: string;
  site_url: string;
}

interface ContractStatusPayload {
  contract_title: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  site_url: string;
}

type NotificationPayload = ServiceRequestPayload | ContractPayload | ContractParticipantPayload | ContractStatusPayload;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    
    if (!webhookUrl) {
      throw new Error("Discord webhook URL not configured");
    }

    const payload: NotificationPayload = await req.json();

    let embed;

    if ('tracking_code' in payload) {
      const dashboardUrl = `${payload.site_url}/dashboard`;
      embed = {
        title: "🚨 New Service Request",
        color: 0x06b6d4,
        description: `[View in Dashboard](${dashboardUrl})\n**Tracking Code:** ${payload.tracking_code}`,
        fields: [
          {
            name: "Client",
            value: `${payload.client_name} (${payload.client_discord})`,
            inline: false,
          },
          {
            name: "Service Type",
            value: payload.service_type,
            inline: true,
          },
          {
            name: "System",
            value: `${payload.system} (${payload.system_code})`,
            inline: true,
          },
          {
            name: "Location",
            value: payload.location_details,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Onyx Services Dispatch",
        },
      };

      if (payload.description) {
        embed.fields.push({
          name: "Additional Details",
          value: payload.description,
          inline: false,
        });
      }
    } else if ('contract_type' in payload) {
      const contractsUrl = `${payload.site_url}/contracts`;
      const formattedPayout = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(payload.target_payout);

      embed = {
        title: "📜 New Contract Posted",
        color: 0x3b82f6,
        description: `[View Contracts](${contractsUrl})`,
        fields: [
          {
            name: "Contract Title",
            value: payload.contract_title,
            inline: false,
          },
          {
            name: "Type",
            value: payload.contract_type.replace('_', ' ').toUpperCase(),
            inline: true,
          },
          {
            name: "Target Payout",
            value: `${formattedPayout} UEC`,
            inline: true,
          },
          {
            name: "Posted By",
            value: payload.created_by,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Onyx Services Contract Manager",
        },
      };

      if (payload.location) {
        embed.fields.push({
          name: "Location",
          value: payload.location,
          inline: false,
        });
      }

      if (payload.description) {
        embed.fields.push({
          name: "Description",
          value: payload.description.substring(0, 1024),
          inline: false,
        });
      }
    } else if ('participant_name' in payload) {
      const contractsUrl = `${payload.site_url}/contracts`;
      const actionText = payload.action === 'joined' ? 'joined' : 'was added to';
      const addedByText = payload.added_by ? ` by ${payload.added_by}` : '';

      embed = {
        title: "👤 Contract Participant Update",
        color: 0x10b981,
        description: `[View Contracts](${contractsUrl})`,
        fields: [
          {
            name: "Contract",
            value: payload.contract_title,
            inline: false,
          },
          {
            name: "Update",
            value: `**${payload.participant_name}** ${actionText} the contract as **${payload.participant_role}**${addedByText}`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Onyx Services Contract Manager",
        },
      };
    } else if ('old_status' in payload) {
      const contractsUrl = `${payload.site_url}/contracts`;
      const statusEmoji = payload.new_status === 'active' ? '▶️' : payload.new_status === 'completed' ? '✅' : '❌';

      embed = {
        title: `${statusEmoji} Contract Status Changed`,
        color: payload.new_status === 'active' ? 0x06b6d4 : payload.new_status === 'completed' ? 0x10b981 : 0xef4444,
        description: `[View Contracts](${contractsUrl})`,
        fields: [
          {
            name: "Contract",
            value: payload.contract_title,
            inline: false,
          },
          {
            name: "Status Change",
            value: `**${payload.old_status.toUpperCase()}** → **${payload.new_status.toUpperCase()}**`,
            inline: true,
          },
          {
            name: "Changed By",
            value: payload.changed_by,
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Onyx Services Contract Manager",
        },
      };
    }

    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      throw new Error(`Discord webhook failed: ${discordResponse.status}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending Discord notification:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
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