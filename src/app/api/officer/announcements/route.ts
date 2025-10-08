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

    // Fetch last 10 announcements
    const { data: announcements, error } = await supabase
      .from('officer_announcements')
      .select(`
        *,
        created_by_profile:profiles!officer_announcements_created_by_fkey(display_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error in GET /api/officer/announcements:', error);
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
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const { data: announcement, error } = await supabase
      .from('officer_announcements')
      .insert({
        message,
        created_by: user.id,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/officer/announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
