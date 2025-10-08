import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has officer access
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('roles, positions')
      .eq('user_id', user.id)
      .single();

    const hasOfficerAccess = 
      userRole?.roles?.includes('officer') ||
      userRole?.positions?.some((p: string) => 
        ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'].includes(p)
      );

    if (!hasOfficerAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all meeting proposals with availability data
    const { data: proposals, error } = await supabase
      .from('meeting_proposals')
      .select(`
        *,
        created_by_profile:profiles!meeting_proposals_created_by_fkey(display_name, email),
        officer_availability(
          id,
          user_id,
          available_slots,
          user_profile:profiles!officer_availability_user_id_fkey(display_name, email)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meeting proposals:', error);
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
    }

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error('Error in GET /api/officer/meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has officer access
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('roles, positions')
      .eq('user_id', user.id)
      .single();

    const hasOfficerAccess = 
      userRole?.roles?.includes('officer') ||
      userRole?.positions?.some((p: string) => 
        ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'].includes(p)
      );

    if (!hasOfficerAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, proposed_dates } = body;

    if (!title || !proposed_dates || !Array.isArray(proposed_dates) || proposed_dates.length === 0) {
      return NextResponse.json({ error: 'Title and proposed dates are required' }, { status: 400 });
    }

    const { data: proposal, error } = await supabase
      .from('meeting_proposals')
      .insert({
        title,
        description,
        proposed_dates,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating meeting proposal:', error);
      return NextResponse.json({ error: 'Failed to create meeting proposal' }, { status: 500 });
    }

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/officer/meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
