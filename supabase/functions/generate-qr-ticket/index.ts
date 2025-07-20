import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import QRCode from 'npm:qrcode@1.5.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateQRRequest {
  registration_id: string;
  event_logo_url?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registration_id, event_logo_url }: GenerateQRRequest = await req.json();

    console.log("Generating QR ticket for registration:", registration_id);

    // Fetch registration details
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select(`
        *,
        events (
          id,
          name,
          event_date,
          location,
          branding_config
        )
      `)
      .eq('id', registration_id)
      .single();

    if (regError || !registration) {
      throw new Error('Registration not found');
    }

    // Generate unique QR code data
    const qrData = `TICKET:${registration_id}:${Date.now()}`;
    
    // Generate QR code image
    const qrOptions = {
      errorCorrectionLevel: 'M' as const,
      type: 'image/png' as const,
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    };

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, qrOptions);
    
    // Convert data URL to blob for storage
    const base64Data = qrCodeDataUrl.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload QR code to storage
    const fileName = `qr-${registration_id}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-logos')
      .upload(`qr-codes/${fileName}`, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload QR code');
    }

    // Get public URL for the uploaded QR code
    const { data: urlData } = supabase.storage
      .from('event-logos')
      .getPublicUrl(`qr-codes/${fileName}`);

    // Create ticket record
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        registration_id: registration_id,
        qr_code: qrData,
        qr_image_url: urlData.publicUrl,
        status: 'unused'
      })
      .select()
      .single();

    if (ticketError) {
      throw new Error('Failed to create ticket');
    }

    console.log("QR ticket generated successfully for registration:", registration_id);

    // Send email notification
    const emailPayload = {
      participant_email: registration.participant_email,
      participant_name: registration.participant_name,
      event_name: registration.events.name,
      event_date: registration.events.event_date,
      event_location: registration.events.location || 'TBA',
      qr_code_data: qrData,
      qr_image_url: urlData.publicUrl
    };

    // Call send-ticket-email function
    const emailResponse = await supabase.functions.invoke('send-ticket-email', {
      body: emailPayload
    });

    if (emailResponse.error) {
      console.error('Email sending failed:', emailResponse.error);
      // Don't fail the whole process if email fails
    }

    return new Response(JSON.stringify({
      success: true,
      ticket: ticket,
      qr_image_url: urlData.publicUrl
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in generate-qr-ticket function:", error);
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