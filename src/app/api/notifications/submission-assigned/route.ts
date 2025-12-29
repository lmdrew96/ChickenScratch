import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';

const notificationSchema = z.object({
  submissionId: z.string().uuid(),
  committeeStatus: z.string().optional(),
  notificationType: z.enum(['new_submission', 'assignment']).optional(),
  submissionTitle: z.string(),
  submissionType: z.string(),
  submissionGenre: z.string().optional(),
  submissionDate: z.string().optional(),
  authorName: z.string().optional(),
});

// Map committee status to position (for workflow assignments)
const STATUS_TO_POSITION: Record<string, string> = {
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

    const { 
      submissionId, 
      committeeStatus, 
      notificationType,
      submissionTitle, 
      submissionType,
      submissionGenre,
      submissionDate,
      authorName 
    } = parsed.data;

    // Determine which position should be notified
    let targetPosition: string;
    
    if (notificationType === 'new_submission') {
      // New submissions always go to Submissions Coordinator
      targetPosition = 'Submissions Coordinator';
    } else if (committeeStatus && STATUS_TO_POSITION[committeeStatus]) {
      // Workflow assignments go to specific positions
      targetPosition = STATUS_TO_POSITION[committeeStatus];
    } else {
      return NextResponse.json({ success: true, message: 'No notification required for this status' });
    }

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
      .map((role) => {
        const profiles = role.profiles as unknown as Array<{ email: string | null; full_name: string | null }>;
        return profiles?.[0]?.email;
      })
      .filter((email: string | null | undefined): email is string => !!email);

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No valid email addresses found' }
      );
    }

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    
    // Determine email subject and content based on notification type
    const isNewSubmission = notificationType === 'new_submission';
    const emailSubject = isNewSubmission 
      ? `New Submission Received: ${submissionTitle}`
      : `New Submission Assigned: ${submissionTitle}`;

    if (!resendApiKey) {
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
          subject: emailSubject,
          html: generateEmailHtml(
            submissionTitle, 
            submissionType, 
            authorName, 
            submissionId,
            submissionGenre,
            submissionDate,
            isNewSubmission
          ),
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
  submissionId: string,
  genre: string | undefined,
  submissionDate: string | undefined,
  isNewSubmission: boolean
): string {
  const committeeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/committee`;
  const headerText = isNewSubmission ? 'New Submission Received' : 'New Submission Assigned';
  const bodyText = isNewSubmission 
    ? 'A new submission has been received and is ready for your review.'
    : 'A new submission has been assigned to you for review.';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerText}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-top: 0;">${headerText}</h1>
          <p style="font-size: 16px; color: #555;">
            ${bodyText}
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
            ${genre ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Genre:</td>
              <td style="padding: 8px 0;">${genre}</td>
            </tr>
            ` : ''}
            ${authorName ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Author:</td>
              <td style="padding: 8px 0;">${authorName}</td>
            </tr>
            ` : ''}
            ${submissionDate ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Submitted:</td>
              <td style="padding: 8px 0;">${new Date(submissionDate).toLocaleDateString()}</td>
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
