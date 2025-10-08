import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

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

    // Log the contact form submission
    console.log('=== Contact Form Submission ===');
    console.log('Timestamp:', timestamp);
    console.log('From:', name, `<${email}>`);
    console.log('Subject:', subject || 'No subject');
    console.log('Message:', message);
    console.log('===============================');

    // TODO: Implement email sending with Resend or other email service
    // For now, we'll just log to console as a placeholder
    // 
    // Example with Resend (when configured):
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'Hen & Ink Contact Form <noreply@yourdomain.com>',
    //   to: 'mbdorsch@udel.edu',
    //   replyTo: email,
    //   subject: `Contact Form: ${subject || 'New Message'}`,
    //   html: `
    //     <h2>New Contact Form Submission</h2>
    //     <p><strong>From:</strong> ${name} (${email})</p>
    //     <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
    //     <p><strong>Message:</strong></p>
    //     <p>${message.replace(/\n/g, '<br>')}</p>
    //     <p><strong>Submitted:</strong> ${new Date(timestamp).toLocaleString()}</p>
    //   `,
    // });

    // For now, simulate successful email sending
    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to process contact form submission' },
      { status: 500 }
    );
  }
}
