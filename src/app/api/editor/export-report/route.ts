import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { db } from '@/lib/supabase/db';
import { getCurrentUserRole } from '@/lib/actions/roles';
import type { Submission } from '@/types/database';

interface SubmissionWithAuthor extends Submission {
  author_name?: string;
}

// Helper function to format committee status
function formatCommitteeStatus(status: string | null): string {
  if (!status) return 'New';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Calculate days since last update
function getDaysSince(date: string | null): number {
  if (!date) return 0;
  const now = new Date();
  const updated = new Date(date);
  const diffTime = Math.abs(now.getTime() - updated.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export async function GET() {
  try {
    // Check if user has Editor-in-Chief position
    const userRole = await getCurrentUserRole();
    const isEditorInChief = userRole?.positions?.includes('Editor-in-Chief');

    if (!isEditorInChief) {
      return NextResponse.json(
        { error: 'Unauthorized - Editor-in-Chief access required' },
        { status: 403 }
      );
    }

    // Fetch all submissions with author names
    const supabase = db();
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No submissions found' },
        { status: 404 }
      );
    }

    // Fetch author names for all submissions
    const ownerIds = [...new Set(data.map((s) => s.owner_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', ownerIds);

    const profileMap = new Map(
      profiles?.map((p) => [p.id, { name: p.name, email: p.email }]) || []
    );

    const submissions: SubmissionWithAuthor[] = data.map((submission) => {
      const profile = profileMap.get(submission.owner_id);
      return {
        ...submission,
        author_name: profile?.name || profile?.email || 'Unknown',
      };
    });

    // Calculate summary statistics
    const totalSubmissions = submissions.length;
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};

    submissions.forEach((s) => {
      const status = s.committee_status || 'new';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (s.type) {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
      }

      if (s.genre) {
        genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
      }
    });

    // Bottleneck count (stuck >7 days)
    const bottleneckCount = submissions.filter(
      (s) => getDaysSince(s.updated_at) > 7 && s.status !== 'published'
    ).length;

    // Prepare CSV data
    const csvData: (string | number)[][] = [];

    csvData.push(['CHICKEN SCRATCH SUBMISSIONS REPORT']);
    csvData.push(['Generated:', new Date().toLocaleString()]);
    csvData.push([]);
    csvData.push(['SUMMARY STATISTICS']);
    csvData.push(['Total Submissions:', totalSubmissions]);
    csvData.push([]);

    csvData.push(['STATUS BREAKDOWN']);
    Object.entries(statusCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([status, count]) => {
        csvData.push([formatCommitteeStatus(status), count]);
      });
    csvData.push([]);

    csvData.push(['TYPE BREAKDOWN']);
    Object.entries(typeCounts).forEach(([type, count]) => {
      csvData.push([type.charAt(0).toUpperCase() + type.slice(1), count]);
    });
    csvData.push([]);

    if (Object.keys(genreCounts).length > 0) {
      csvData.push(['GENRE BREAKDOWN']);
      Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([genre, count]) => {
          csvData.push([genre, count]);
        });
      csvData.push([]);
    }

    csvData.push(['BOTTLENECK ANALYSIS']);
    csvData.push(['Submissions stuck >7 days:', bottleneckCount]);
    csvData.push([]);
    csvData.push([]);

    csvData.push(['INDIVIDUAL SUBMISSIONS']);
    csvData.push([
      'Title',
      'Author',
      'Type',
      'Genre',
      'Status',
      'Committee Status',
      'Word Count',
      'Created Date',
      'Updated Date',
      'Days Since Update',
      'Decision Date',
      'Published',
      'Published URL',
      'Issue',
    ]);

    submissions.forEach((submission) => {
      csvData.push([
        submission.title || '',
        submission.author_name || '',
        submission.type || '',
        submission.genre || '',
        submission.status || '',
        formatCommitteeStatus(submission.committee_status),
        submission.word_count || '',
        submission.created_at
          ? new Date(submission.created_at).toLocaleDateString()
          : '',
        submission.updated_at
          ? new Date(submission.updated_at).toLocaleDateString()
          : '',
        getDaysSince(submission.updated_at),
        submission.decision_date
          ? new Date(submission.decision_date).toLocaleDateString()
          : '',
        submission.published ? 'Yes' : 'No',
        submission.published_url || '',
        submission.issue || '',
      ]);
    });

    // Generate CSV
    const csv = Papa.unparse(csvData);

    const date = new Date().toISOString().split('T')[0];
    const filename = `chicken-scratch-report-${date}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
