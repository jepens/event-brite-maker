import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

// Create Supabase admin client
const supabaseUrl = "https://mjolfjoqfnszvvlbzhjn.supabase.co";
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
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

    console.log("Starting email send process");
    console.log("Email parameters:", {
      to: participant_email,
      event: event_name,
      has_qr_image: !!qr_image_url
    });

    // Format the date for display
    const formattedDate = new Date(event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send email using Supabase Auth
    const { error: emailError } = await supabaseAdmin.auth.admin.sendEmail(
      participant_email,
      'ticket-notification',
      {
        user_metadata: {
          participant_name,
          event_name,
          event_date: formattedDate,
          event_location,
          qr_code_data,
          qr_image_url
        }
      }
    );

    if (emailError) {
      console.error("Email sending error:", emailError);
      throw emailError;
    }

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipient: participant_email
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-ticket-email function:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });

    // Return a proper error response
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred',
        details: {
          name: error.name,
          code: error.code,
          type: 'email_sending_error'
        }
      }),
      {
        status: 400, // Using 400 instead of 500 for client-related errors
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
};

serve(handler);