// Import necessary modules for Deno, Supabase, and QRCode generation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import QRCode from 'npm:qrcode@1.5.3'; // Importing QRCode library from npm via Deno's npm specifier

// Define CORS headers to allow cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", // Allowed headers
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

// Initialize Supabase client with URL and Service Role Key from environment variables
// Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your Supabase project's Edge Functions settings
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Function to generate unique 8-character short code
function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Main handler function for the Edge Function
const handler = async (req) => {
  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders // Apply CORS headers
    });
  }

  try {
    // Parse the request body to extract registration_id, optional event_logo_url, and notification options
    const { registration_id, event_logo_url, notification_options } = await req.json();
    console.log("Starting QR ticket generation for registration:", registration_id);
    console.log("Supabase URL configured:", !!Deno.env.get('SUPABASE_URL'));
    console.log("Service Role Key configured:", !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Fetch registration details along with associated event data
    const { data: registrationData, error: regError } = await supabase.from('registrations').select(`
      *,
      events (
        id,
        name,
        event_date,
        location,
        branding_config,
        whatsapp_enabled
      )
    `).eq('id', registration_id).limit(1);

    if (regError) {
      console.error('Error fetching registration:', regError);
      throw new Error(`Failed to fetch registration: ${regError.message}`);
    }

    if (!registrationData || registrationData.length === 0) {
      throw new Error('Registration not found');
    }

    const registration = registrationData[0];

    if (regError) {
      console.error('Error fetching registration:', regError);
      throw new Error(`Failed to fetch registration: ${regError.message}`);
    }

    if (!registration) {
      throw new Error('Registration not found');
    }

    console.log("Registration fetched successfully:", {
      id: registration.id,
      event_id: registration.event_id,
      has_event_data: !!registration.events,
      whatsapp_enabled: registration.events?.whatsapp_enabled,
      has_phone: !!registration.phone_number
    });

    // Generate unique short code for manual verification (8 characters)
    const shortCode = generateShortCode();
    
    // Generate optimized QR code data using short code only (no prefix)
    const qrData = shortCode;

    // Generate QR code image as a Data URL
    const qrOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF' // Light modules color
      },
      width: 300 // Width of the QR code image
    };

    console.log("Generating QR code with data:", qrData);
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, qrOptions);
    console.log("QR code image generated successfully");

    // Convert Data URL to a Buffer (Uint8Array) for Supabase Storage upload
    const base64Data = qrCodeDataUrl.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload QR code image to Supabase Storage
    const fileName = `qr-${registration_id}-${Date.now()}.png`;
    console.log("Uploading QR code to storage:", fileName);
    const { data: uploadData, error: uploadError } = await supabase.storage.from('event-logos').upload(`qr-codes/${fileName}`, imageBuffer, {
      contentType: 'image/png',
      upsert: false // Do not overwrite if file exists
    });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload QR code: ${uploadError.message}`);
    }

    console.log("QR code uploaded successfully");

    // Get the public URL for the uploaded QR code image
    const { data: urlData } = supabase.storage.from('event-logos').getPublicUrl(`qr-codes/${fileName}`);

    // Create a new ticket record in the 'tickets' table
    console.log("Creating ticket record with short code:", shortCode);
    const { data: ticketData, error: ticketError } = await supabase.from('tickets').insert({
      registration_id: registration_id,
      qr_code: qrData,
      short_code: shortCode,
      qr_image_url: urlData.publicUrl,
      status: 'unused'
    }).select().limit(1);

    if (ticketError) {
      console.error('Ticket creation error:', ticketError);
      throw new Error(`Failed to create ticket: ${ticketError.message}`);
    }

    if (!ticketData || ticketData.length === 0) {
      throw new Error('Failed to create ticket record');
    }

    const ticket = ticketData[0];
    console.log("Ticket record created successfully");

    // Default notification options if not provided
    const defaultNotificationOptions = { sendEmail: true, sendWhatsApp: true };
    const finalNotificationOptions = notification_options || defaultNotificationOptions;

    console.log("Notification options:", finalNotificationOptions);

    // Send email notification (if enabled)
    if (finalNotificationOptions.sendEmail && registration.participant_email) {
      const emailPayload = {
        participant_email: registration.participant_email,
        participant_name: registration.participant_name,
        event_name: registration.events.name,
        event_date: registration.events.event_date,
        event_location: registration.events.location || 'TBA',
        qr_code_data: qrData,
        short_code: shortCode,
        qr_image_url: urlData.publicUrl
      };

      console.log("Sending email notification with payload:", emailPayload);

      // Invoke the 'send-ticket-email' Edge Function to send the email
      const emailResponse = await supabase.functions.invoke('send-ticket-email', {
        body: emailPayload
      });

      if (emailResponse.error) {
        console.error('Email sending failed:', emailResponse.error);
        // Log the error but don't fail the entire process if email sending fails.
        // The ticket is already generated and stored.
      } else {
        console.log("Email sent successfully");
      }
    } else {
      console.log("Email notification skipped (disabled or no email)");
    }

    // Send WhatsApp notification (if enabled and phone number provided)
    if (finalNotificationOptions.sendWhatsApp && registration.events?.whatsapp_enabled && registration.phone_number) {
      console.log("Sending WhatsApp notification for registration:", registration_id);
      
      const whatsappResponse = await supabase.functions.invoke('send-whatsapp-ticket', {
        body: { registration_id }
      });

      if (whatsappResponse.error) {
        console.error('WhatsApp sending failed:', whatsappResponse.error);
        // Don't fail the whole process if WhatsApp fails
      } else {
        console.log("WhatsApp sent successfully");
      }
    } else {
      console.log("WhatsApp notification skipped (disabled, not enabled, or no phone)");
    }

    // Return a success response with ticket details and QR image URL
    return new Response(JSON.stringify({
      success: true,
      ticket: ticket,
      qr_image_url: urlData.publicUrl
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });

  } catch (error) {
    // Catch and handle any errors during the process, returning an error response
    console.error("Error in generate-qr-ticket function:", error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack // Include stack trace for detailed debugging
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};

// Serve the handler function for the Edge Function
serve(handler);