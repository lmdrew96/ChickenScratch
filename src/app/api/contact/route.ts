import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // 1. Log at the very start
  console.log('🚀 Contact form API called');
  
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

    // 2. Log the parsed form data (excluding sensitive info)
    console.log('=== 📬 CONTACT FORM SUBMISSION ===');
    console.log(`Timestamp: ${timestamp}`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Subject: ${subject || 'No subject'}`);
    console.log(`Message length: ${message.length} characters`);
    console.log('===================================');

    // 3. Log before calling Resend
    console.log('🔄 Attempting to send email via Resend');
    
    // 4. Log Resend API key exists
    console.log('🔑 Resend API key exists:', !!process.env.RESEND_API_KEY);
    console.log('🔑 Resend API key length:', process.env.RESEND_API_KEY?.length || 0);
    
    // Send email using Resend
    try {
      console.log('📤 Calling resend.emails.send...');
      const emailResult = await resend.emails.send({
        from: 'Chicken Scratch <onboarding@resend.dev>',
        to: 'mbdorsch@udel.edu',
        replyTo: email,
        subject: `Contact Form: ${subject || 'New Message'}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><em>Submitted: ${new Date(timestamp).toLocaleString()}</em></p>
        `,
      });
      
      // 5. Log the full Resend response
      console.log(`[${timestamp}] ✅ Email sent successfully!`);
      console.log('📧 Resend response:', JSON.stringify(emailResult, null, 2));
      console.log('📧 Email ID:', emailResult.data?.id);
    } catch (emailError) {
      // 5. Log the full Resend error
      console.error(`[${timestamp}] ❌ Email sending failed!`);
      console.error('❌ Resend error type:', emailError instanceof Error ? emailError.constructor.name : typeof emailError);
      console.error('❌ Resend error message:', emailError instanceof Error ? emailError.message : String(emailError));
      console.error('❌ Resend error stack:', emailError instanceof Error ? emailError.stack : 'No stack trace');
      console.error('❌ Full Resend error object:', JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2));
      throw emailError;
    }

    console.log(`[${timestamp}] ✅ Contact form processed and email sent`);
    
    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
    });
  } catch (error) {
    // 6. Detailed error logging in catch block
    console.error(`[${timestamp}] ❌ Contact form error caught in main try-catch!`);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error(`[${timestamp}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
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
