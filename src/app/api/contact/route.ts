import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 📧 Contact form submission received`);
    
    const body = await request.json();
    console.log(`[${timestamp}] 📝 Request body:`, JSON.stringify(body, null, 2));
    
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      console.error(`[${timestamp}] ❌ Validation failed:`, parsed.error.errors);
      return NextResponse.json(
        { error: 'Invalid form data', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;

    // Enhanced logging for debugging
    console.log('=== 📬 CONTACT FORM SUBMISSION ===');
    console.log(`Timestamp: ${timestamp}`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Subject: ${subject || 'No subject'}`);
    console.log(`Message: ${message}`);
    console.log('===================================');

    // ⚠️ WARNING: NO EMAIL IS ACTUALLY BEING SENT!
    // This is just logging to console as a placeholder.
    console.warn(`[${timestamp}] ⚠️  EMAIL NOT SENT - No email service configured!`);
    console.warn(`[${timestamp}] 💡 To enable email sending:`);
    console.warn(`[${timestamp}]    1. Install Resend: pnpm add resend`);
    console.warn(`[${timestamp}]    2. Add RESEND_API_KEY to .env.local`);
    console.warn(`[${timestamp}]    3. Uncomment email sending code below`);
    
    // TODO: Implement email sending with Resend or other email service
    // 
    // Example with Resend (when configured):
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // try {
    //   const emailResult = await resend.emails.send({
    //     from: 'Hen & Ink Contact Form <noreply@yourdomain.com>',
    //     to: 'mbdorsch@udel.edu',
    //     replyTo: email,
    //     subject: `Contact Form: ${subject || 'New Message'}`,
    //     html: `
    //       <h2>New Contact Form Submission</h2>
    //       <p><strong>From:</strong> ${name} (${email})</p>
    //       <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
    //       <p><strong>Message:</strong></p>
    //       <p>${message.replace(/\n/g, '<br>')}</p>
    //       <p><strong>Submitted:</strong> ${new Date(timestamp).toLocaleString()}</p>
    //     `,
    //   });
    //   console.log(`[${timestamp}] ✅ Email sent successfully:`, emailResult);
    // } catch (emailError) {
    //   console.error(`[${timestamp}] ❌ Email sending failed:`, emailError);
    //   throw emailError;
    // }

    console.log(`[${timestamp}] ✅ Contact form processed (but email NOT sent)`);
    
    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
      warning: 'Email service not configured - submission logged only',
    });
  } catch (error) {
    console.error(`[${timestamp}] ❌ Contact form error:`, error);
    console.error(`[${timestamp}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process contact form submission',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
