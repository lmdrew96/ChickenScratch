import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';

const notificationSchema = z.object({
  submissionId: z.string().uuid(),
  committeeStatus: z.string(),
  submissionTitle: z.string(),
  submissionType: z.string(),
  authorName: z.string().optional(),
});

// Map committee status to position
const STATUS_TO_POSITION: Record<string, string> = {
  'with_coordinator': 'Submissions Coordinator',
  'with_proofreader': 'Proofreader',
  'with_lead_design': 'Lead Design',
  'with_editor_in_chief': 'Editor-in-Chief',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = notificationSchema.safeParse(body);

    if (!parsed.success) {
      console.error('[Notification] Invalid request data:', parsed.error);
      return NextResponse.json(
        { error: 'Invalid notification data' },
        { status: 400 }
      );
    }

    const { submissionId, committeeStatus, submissionTitle, submissionType, authorName } = parsed.data;

    // Determine which position should be notified
    const targetPosition = STATUS_TO_POSITION[committeeStatus];
    
    if (!targetPosition) {
      console.log('[Notification] No notification needed for status:', committeeStatus);
      return NextResponse.json({ success: true, message: 'No notification required for this status' });
    }

    console.log('[Notification] Looking up users with position:', targetPosition);

    // Get users with the target position
    const supabase = await createSupabaseRouteHandlerClient();
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        positions,
        profiles!user_roles_user_id_fkey(
          email,
          full_name
        )
      `)
      .contains('positions', [targetPosition]);

    if (rolesError) {
      console.error('[Notification] Error fetching user roles:', rolesError);
      return NextResponse.json(
        { error: 'Failed to fetch committee members' },
        { status: 500 }
      );
    }

    if (!userRoles || userRoles.length === 0) {
      console.warn('[Notification] No users found with position:', targetPosition);
      return NextResponse.json(
        { success: true, message: 'No users found with required position' }
      );
    }

    // Extract emails
    const recipients = userRoles
      .map((role: any) => role.profiles?.[0]?.email)
      .filter((email: string | undefined): email is string => !!email);

    if (recipients.length === 0) {
      console.warn('[Notification] No valid email addresses found for position:', targetPosition);
      return NextResponse.json(
        { success: true, message: 'No valid email addresses found' }
      );
    }

    console.log('[Notification] Sending emails to:', recipients);

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.warn('[Notification] RESEND_API_KEY not configured, logging email instead');
      console.log('[Notification] Would send email:', {
        from: 'Chicken Scratch <notifications@chickenscratch.me>',
        to: recipients,
        subject: `New Submission Assigned: ${submissionTitle}`,
        html: generateEmailHtml(submissionTitle, submissionType, authorName, submissionId),
      });
      return NextResponse.json({ 
        success: true, 
        message: 'Email logged (Resend not configured)',
        recipients 
      });
    }

    // Send email via Resend
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Chicken Scratch <notifications@chickenscratch.me>',
          to: recipients,
          subject: `New Submission Assigned: ${submissionTitle}`,
          html: generateEmailHtml(submissionTitle, submissionType, authorName, submissionId),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Notification] Resend API error:', errorData);
        return NextResponse.json(
          { error: 'Failed to send email', details: errorData },
          { status: 500 }
        );
      }

      const result = await response.json();
      console.log('[Notification] Email sent successfully:', result);

      return NextResponse.json({
        success: true,
        message: 'Notification sent',
        recipients,
        emailId: result.id,
      });
    } catch (emailError) {
      console.error('[Notification] Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Notification] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateEmailHtml(
  title: string,
  type: string,
  authorName: string | undefined,
  submissionId: string
): string {
  const committeeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/committee`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Submission Assigned</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-top: 0;">New Submission Assigned</h1>
          <p style="font-size: 16px; color: #555;">
            A new submission has been assigned to you for review.
          </p>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Submission Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Title:</td>
              <td style="padding: 8px 0;">${title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Type:</td>
              <td style="padding: 8px 0;">${type}</td>
            </tr>
            ${authorName ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Author:</td>
              <td style="padding: 8px 0;">${authorName}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Submission ID:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${submissionId}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${committeeUrl}" 
             style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; font-size: 16px;">
            View in Committee Dashboard
          </a>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #777;">
          <p>
            This is an automated notification from Chicken Scratch. 
            Please log in to the committee dashboard to review and take action on this submission.
          </p>
          <p style="margin-bottom: 0;">
            <strong>Chicken Scratch</strong><br>
            Hen & Ink Society
          </p>
        </div>
      </body>
    </html>
  `;
}
