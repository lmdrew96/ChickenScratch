import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/utils';
import { env } from '@/lib/env';
import { rateLimit, contactFormLimiter, getClientIp } from '@/lib/rate-limit';

const CONTACT_RECIPIENTS = env.CONTACT_FORM_RECIPIENTS
  ? env.CONTACT_FORM_RECIPIENTS.split(',').map(e => e.trim()).filter(Boolean)
  : [];

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`contact:${ip}`, contactFormLimiter);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

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
      await getResend().emails.send({
        from: 'Chicken Scratch <contact@chickenscratch.me>',
        to: CONTACT_RECIPIENTS,
        replyTo: email,
        subject: `Contact Form: ${subject || 'New Message'}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject || 'No subject')}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
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
      { error: 'Failed to process contact form submission' },
      { status: 500 }
    );
  }
}
