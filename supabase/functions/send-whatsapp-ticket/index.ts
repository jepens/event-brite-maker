import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
// Rate limiting configuration
const RATE_LIMITS = {
  messages_per_second: 5,
  messages_per_minute: 250,
  messages_per_hour: 1000,
  retry_after_seconds: 60,
  max_retries: 3
};
// Simple in-memory rate limiter (in production, use Redis)
const rateLimitStore = new Map();
function isRateLimited(phoneNumber) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const timestamps = rateLimitStore.get(phoneNumber) || [];
  // Remove old timestamps
  const recentTimestamps = timestamps.filter((time)=>now - time < windowMs);
  if (recentTimestamps.length >= RATE_LIMITS.messages_per_minute) {
    return true;
  }
  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitStore.set(phoneNumber, recentTimestamps);
  return false;
}
function validatePhoneNumber(phone) {
  // Basic validation for Indonesian phone numbers
  const phoneRegex = /^628[0-9]{8,11}$/;
  return phoneRegex.test(phone);
}
function formatDate(date, format, useShort) {
  const eventDate = new Date(date);
  
  // Ensure we're working with WIB timezone (UTC+7)
  const wibDate = new Date(eventDate.getTime() + (7 * 60 * 60 * 1000));
  
  if (useShort) {
    // Format pendek: "25 Jan 2024" (tanpa waktu)
    return wibDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
  }
  if (format === 'DD/MM/YYYY HH:mm') {
    // Format: "25/01/2024 19:00" (dengan waktu untuk format khusus)
    return wibDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    }).replace(/\//g, '/');
  }
  // Format default: "Jumat, 8 Agustus 2025" (tanpa waktu)
  return wibDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
}
function formatTime(date) {
  const eventDate = new Date(date);
  
  // Ensure we're working with WIB timezone (UTC+7)
  const wibDate = new Date(eventDate.getTime() + (7 * 60 * 60 * 1000));
  
  return wibDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  });
}
function getDresscode(eventData) {
  // Check if dresscode is defined in event data
  if (eventData.dresscode) {
    return eventData.dresscode;
  }
  // Default dresscode based on event type or time
  const eventDate = new Date(eventData.event_date);
  const hour = eventDate.getHours();
  if (hour >= 18 || hour < 6) {
    // Evening/Night events
    return "Smart Casual / Semi Formal";
  } else if (hour >= 12 && hour < 18) {
    // Afternoon events
    return "Casual / Smart Casual";
  } else {
    // Morning events
    return "Casual / Comfortable";
  }
}
const handler = async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Bypass JWT verification for testing
  console.log("WhatsApp function called - bypassing JWT verification");
  try {
    const { registration_id, template_name, language_code, include_header = true, custom_date_format, use_short_params = false } = await req.json();
    console.log("Starting WhatsApp ticket send for registration:", registration_id);
    console.log("Using template name:", template_name || 'ticket_confirmation (default)');
    console.log("Using language code:", language_code || 'id (default)');
    console.log("Include header image:", include_header);
    console.log("Custom date format:", custom_date_format);
    console.log("Use short params:", use_short_params);
    // Debug environment variables
    console.log("Environment variables check:");
    console.log("SUPABASE_URL:", Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT SET');
    console.log("SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'NOT SET');
    console.log("WHATSAPP_ACCESS_TOKEN:", Deno.env.get('WHATSAPP_ACCESS_TOKEN') ? 'SET' : 'NOT SET');
    console.log("WHATSAPP_PHONE_NUMBER_ID:", Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ? 'SET' : 'NOT SET');
    console.log("WHATSAPP_TEMPLATE_NAME:", Deno.env.get('WHATSAPP_TEMPLATE_NAME') ? 'SET' : 'NOT SET');
    // Fetch registration details with event and ticket info
    const { data: registration, error: regError } = await supabase.from('registrations').select(`
        *,
        events (
          id,
          name,
          event_date,
          location,
          whatsapp_enabled,
          dresscode
        ),
        tickets (
          id,
          qr_code,
          short_code,
          qr_image_url,
          whatsapp_sent
        )
      `).eq('id', registration_id).single();
    if (regError) {
      console.error('Error fetching registration:', regError);
      throw new Error(`Failed to fetch registration: ${regError.message}`);
    }
    if (!registration) {
      throw new Error('Registration not found');
    }
    if (!registration.events) {
      throw new Error('Event not found');
    }
    if (!registration.events.whatsapp_enabled) {
      throw new Error('WhatsApp is not enabled for this event');
    }
    if (!registration.phone_number) {
      throw new Error('Phone number not provided for registration');
    }
    if (!validatePhoneNumber(registration.phone_number)) {
      throw new Error('Invalid phone number format. Expected format: 6281314942011');
    }
    if (registration.tickets && registration.tickets.whatsapp_sent) {
      throw new Error('WhatsApp ticket already sent for this registration');
    }
    // Check rate limiting
    if (isRateLimited(registration.phone_number)) {
      throw new Error('Rate limit exceeded for this phone number');
    }
    // Format date and time separately
    const formattedDate = formatDate(registration.events.event_date, custom_date_format, use_short_params);
    const formattedTime = formatTime(registration.events.event_date);
    // Get dresscode
    const dresscode = getDresscode(registration.events);
    // Use provided template name or fallback to environment variable or default
    const finalTemplateName = template_name || Deno.env.get('WHATSAPP_TEMPLATE_NAME') || 'ticket_confirmation';
    const finalLanguageCode = language_code || 'id';
    // Prepare parameters based on options
    let customerName = registration.participant_name;
    let eventName = registration.events.name;
    let location = registration.events.location || "TBA";
    // Use short_code from ticket (generated by generate-qr-ticket function)
    let ticketCode = registration.tickets?.short_code || registration.tickets?.qr_code || "";
    console.log("Ticket code from database:", {
      short_code: registration.tickets?.short_code,
      qr_code: registration.tickets?.qr_code?.substring(0, 30) + "...",
      final_ticket_code: ticketCode
    });
    if (use_short_params) {
      // Gunakan parameter yang lebih pendek
      customerName = customerName.length > 20 ? customerName.substring(0, 20) + "..." : customerName;
      eventName = eventName.length > 30 ? eventName.substring(0, 30) + "..." : eventName;
      location = location.length > 20 ? location.substring(0, 20) + "..." : location;
      ticketCode = ticketCode.length > 10 ? ticketCode.substring(0, 10) : ticketCode;
    }
    // Prepare WhatsApp payload for new template with 7 parameters
    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: registration.phone_number,
      type: "template",
      template: {
        name: finalTemplateName,
        language: {
          code: finalLanguageCode
        },
        components: []
      }
    };
    // Add header component if include_header is true and QR image URL exists
    if (include_header && registration.tickets?.qr_image_url) {
      whatsappPayload.template.components.push({
        type: "header",
        parameters: [
          {
            type: "image",
            image: {
              link: registration.tickets.qr_image_url
            }
          }
        ]
      });
    }
    // Add body component with 7 numbered parameters for new template
    whatsappPayload.template.components.push({
      type: "body",
      parameters: [
        {
          type: "text",
          text: customerName // {{1}} - customer_name
        },
        {
          type: "text",
          text: eventName // {{2}} - event_name
        },
        {
          type: "text",
          text: formattedDate // {{3}} - date
        },
        {
          type: "text",
          text: formattedTime // {{4}} - time
        },
        {
          type: "text",
          text: location // {{5}} - location
        },
        {
          type: "text",
          text: ticketCode // {{6}} - ticket_code
        },
        {
          type: "text",
          text: dresscode // {{7}} - dresscode
        }
      ]
    });
    console.log("Sending WhatsApp message with payload:", {
      to: registration.phone_number,
      event: registration.events.name,
      has_qr_image: !!registration.tickets?.qr_image_url,
      include_header: include_header,
      phone_number_id: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'),
      template_name: finalTemplateName,
      language_code: finalLanguageCode,
      use_short_params: use_short_params,
      custom_date_format: custom_date_format,
      template_variables: {
        customer_name: customerName,
        event_name: eventName,
        date: formattedDate,
        time: formattedTime,
        location: location,
        ticket_code: ticketCode,
        dresscode: dresscode
      }
    });
    // Send WhatsApp message
    const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(whatsappPayload)
    });
    const whatsappResult = await whatsappResponse.json();
    if (!whatsappResponse.ok) {
      console.error("WhatsApp API error:", whatsappResult);
      throw new Error(`WhatsApp API error: ${whatsappResult.error?.message || 'Unknown error'}`);
    }
    console.log("WhatsApp message sent successfully:", whatsappResult);
    // Update ticket record to mark WhatsApp as sent
    if (registration.tickets) {
      const { error: updateError } = await supabase.from('tickets').update({
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString()
      }).eq('id', registration.tickets.id);
      if (updateError) {
        console.error('Error updating ticket WhatsApp status:', updateError);
      // Don't fail the whole process if update fails
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp ticket sent successfully',
      recipient: registration.phone_number,
      message_id: whatsappResult.messages?.[0]?.id,
      template_used: finalTemplateName,
      language_used: finalLanguageCode,
      include_header: include_header,
      use_short_params: use_short_params,
      custom_date_format: custom_date_format,
      dresscode: dresscode
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-whatsapp-ticket function:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({
      error: error.message || 'An unknown error occurred',
      details: {
        name: error.name,
        type: 'whatsapp_sending_error'
      }
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
serve(handler);
