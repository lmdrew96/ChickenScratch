import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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
    const { finalized_date, available_slots } = body;

    // If finalizing a meeting
    if (finalized_date !== undefined) {
      const { data: proposal, error } = await supabase
        .from('meeting_proposals')
        .update({ finalized_date } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error finalizing meeting:', error);
        return NextResponse.json({ error: 'Failed to finalize meeting' }, { status: 500 });
      }

      return NextResponse.json({ proposal });
    }

    // If updating availability
    if (available_slots !== undefined) {
      const { data: availability, error } = await supabase
        .from('officer_availability')
        .upsert({
          user_id: user.id,
          meeting_proposal_id: id,
          available_slots,
        } as never)
        .select()
        .single();

      if (error) {
        console.error('Error updating availability:', error);
        return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
      }

      return NextResponse.json({ availability });
    }

    return NextResponse.json({ error: 'No valid update provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in PATCH /api/officer/meetings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
