// Import necessary modules for Deno and Resend
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0"; // Importing Resend from npm via Deno's npm specifier
// Initialize Resend client with API key from environment variables
// Ensure 'RESEND_API_KEY' is set in your Supabase project's Edge Functions settings
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
// Define CORS headers to allow cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" // Allowed headers
};
// Main handler function for the Edge Function
const handler = async (req)=>{
  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders // Apply CORS headers
    });
  }
  try {
    // Parse the request body to extract necessary email parameters
    const { registration_id, participant_email, participant_name, event_name, event_date, event_location, qr_code_data, qr_image_url, short_code } = await req.json();
    // Log parameters for debugging purposes
    console.log("Starting email send process");
    console.log("Email parameters:", {
      to: participant_email,
      event: event_name,
      has_qr_image: !!qr_image_url, // Check if qr_image_url is provided
      short_code: short_code || 'not provided',
      qr_code_data: qr_code_data ? qr_code_data.substring(0, 30) + '...' : 'not provided'
    });
    // Format the event date for better display in the email (WIB timezone)
    const eventDate = new Date(event_date);
    
    // Jika tanggal sudah dalam format ISO dengan timezone, gunakan langsung
    // Jika tidak, asumsikan sudah dalam WIB timezone
    const dateToFormat = eventDate;
    
    const formattedDate = dateToFormat.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
    // Create the HTML content for the email
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Ticket - ${event_name}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .qr-code { text-align: center; margin: 20px 0; }
        .qr-code img { max-width: 200px; border: 2px solid #ddd; border-radius: 8px; }
        .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
        .btn { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .info-row { margin: 10px 0; padding: 10px; background: #f1f3f4; border-radius: 5px; }
        .info-label { font-weight: bold; color: #555; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 Event Ticket</h1>
          <h2>${event_name}</h2>
        </div>
        
        <div class="content">
          <p>Hello <strong>${participant_name}</strong>,</p>
          
          <p>Thank you for registering! Here are your event details and digital ticket:</p>
          
          <div class="ticket-info">
            <div class="info-row">
              <span class="info-label">📅 Date & Time:</span><br>
              ${formattedDate}
            </div>
            
            <div class="info-row">
              <span class="info-label">📍 Location:</span><br>
              ${event_location}
            </div>
            
            <div class="info-row">
              <span class="info-label">🎟️ Ticket Code:</span><br>
              <code style="background: #e9ecef; padding: 5px 10px; border-radius: 3px; font-family: monospace;">${short_code || qr_code_data}</code>
            </div>
          </div>

          ${qr_image_url ? `
          <div class="qr-code">
            <p><strong>Your QR Code Ticket:</strong></p>
            <img src="${qr_image_url}" alt="QR Code Ticket" />
            <p><em>Show this QR code at the event entrance</em></p>
          </div>
          ` : ''}
          
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <strong>📋 Important Instructions:</strong>
            <ul>
              <li>Please arrive 15 minutes before the event starts</li>
              <li>Show this QR code or ticket code at the entrance</li>
              <li>Keep this email accessible on your phone</li>
              <li>Contact us if you have any questions</li>
            </ul>
          </div>
          
          <p>We look forward to seeing you at the event!</p>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    // Create the plain text content for the email (fallback for clients that don't render HTML)
    const textContent = `
Event Ticket - ${event_name}

Hello ${participant_name},

Thank you for registering! Here are your event details:

📅 Date & Time: ${formattedDate}
📍 Location: ${event_location}
🎟️ Ticket Code: ${short_code || qr_code_data}

${qr_image_url ? 'Your QR code ticket is attached to this email. Please show it at the event entrance.' : ''}

Important Instructions:
- Please arrive 15 minutes before the event starts
- Show your QR code or ticket code at the entrance
- Keep this email accessible on your phone
- Contact us if you have any questions

We look forward to seeing you at the event!

---
This is an automated email. Please do not reply to this message.
    `;
    // Send email using Resend
    const emailResponse = await resend.emails.send({
      // IMPORTANT: Change this 'from' address to your verified domain email
      from: "Event Registration <event@sailendra.co.id>",
      to: [
        participant_email
      ],
      subject: `🎫 Your Ticket for ${event_name}`,
      html: htmlContent,
      text: textContent
    });
    // Check for errors from Resend API
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      // Provide a more specific error message if it's related to domain verification
      if (emailResponse.error.message && emailResponse.error.message.includes('verify a domain')) {
        throw new Error(`Email sending failed: You need to verify a domain at resend.com/domains to send emails to other recipients. Currently, you can only send emails to your own email address.`);
      }
      throw new Error(`Failed to send email: ${emailResponse.error.message || 'Unknown error'}`);
    }

    // Update ticket record to mark email as sent
    if (registration_id) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          const { error: updateError } = await supabase
            .from('tickets')
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString()
            })
            .eq('registration_id', registration_id);
          
          if (updateError) {
            console.error('Error updating ticket email status:', updateError);
            // Don't fail the whole process if update fails
          } else {
            console.log('Email status updated successfully for registration:', registration_id);
          }
        }
      } catch (updateError) {
        console.error('Error updating email status:', updateError);
        // Don't fail the whole process if update fails
      }
    }

    // Log success and return a success response
    console.log("Email sent successfully:", emailResponse.data);
    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      recipient: participant_email,
      email_id: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    // Catch and handle any errors during the process
    console.error("Error in send-ticket-email function:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({
      error: error.message || 'An unknown error occurred',
      details: {
        name: error.name,
        type: 'email_sending_error'
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
// Serve the handler function
serve(handler);
