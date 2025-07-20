import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendTicketEmailRequest {
  participant_email: string;
  participant_name: string;
  event_name: string;
  event_date: string;
  event_location: string;
  qr_code_data: string;
  qr_image_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      participant_email, 
      participant_name, 
      event_name, 
      event_date, 
      event_location, 
      qr_code_data,
      qr_image_url 
    }: SendTicketEmailRequest = await req.json();

    console.log("Sending ticket email to:", participant_email);

    const emailResponse = await resend.emails.send({
      from: "Event Tickets <noreply@resend.dev>",
      to: [participant_email],
      subject: `Your ticket for ${event_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Event Ticket</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .ticket-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .qr-container { text-align: center; margin: 30px 0; padding: 20px; background: white; border: 2px dashed #ddd; border-radius: 8px; }
            .qr-code { max-width: 200px; height: auto; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
            .important { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎟️ Your Event Ticket</h1>
              <p>You're all set for the event!</p>
            </div>
            
            <div class="content">
              <h2>Hello ${participant_name}!</h2>
              <p>Great news! Your registration for <strong>${event_name}</strong> has been approved. Here are your event details:</p>
              
              <div class="ticket-info">
                <h3>📅 Event Details</h3>
                <p><strong>Event:</strong> ${event_name}</p>
                <p><strong>Date:</strong> ${new Date(event_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>Time:</strong> ${new Date(event_date).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</p>
                <p><strong>Location:</strong> ${event_location}</p>
              </div>

              <div class="qr-container">
                <h3>🔍 Your QR Code Ticket</h3>
                <p>Present this QR code at the event entrance:</p>
                ${qr_image_url ? 
                  `<img src="${qr_image_url}" alt="QR Code Ticket" class="qr-code" />` : 
                  `<div style="font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 4px; word-break: break-all;">${qr_code_data}</div>`
                }
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                  Keep this QR code safe - it's your entry pass!
                </p>
              </div>

              <div class="important">
                <h4>⚠️ Important Notes:</h4>
                <ul>
                  <li>This QR code can only be used <strong>once</strong></li>
                  <li>Please arrive 15 minutes before the event starts</li>
                  <li>Keep this email or save the QR code to your phone</li>
                  <li>Contact support if you have any issues</li>
                </ul>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for registering! We look forward to seeing you at the event.</p>
              <p style="font-size: 12px;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-ticket-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);