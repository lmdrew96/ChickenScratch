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
  try {
    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid form data', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;
    const timestamp = new Date().toISOString();

    try {
      await resend.emails.send({
        from: 'Chicken Scratch <contact@chickenscratch.me>',
        to: ['mbdorsch@udel.edu', 'lmdrew@udel.edu'],
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
    } catch (emailError) {
      console.error('Email sending failed:', emailError instanceof Error ? emailError.message : String(emailError));
      throw emailError;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
    });
  } catch (error) {
    console.error('Contact form error:', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { 
        error: 'Failed to process contact form submission',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
