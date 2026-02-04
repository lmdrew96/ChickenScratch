import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles, userRoles } from '@/lib/db/schema';
import { isAdmin } from '@/lib/actions/roles';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check if user is admin
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const userId = id;
    const database = db();

    // Delete from user_roles table first (foreign key constraint)
    try {
      await database
        .delete(userRoles)
        .where(eq(userRoles.user_id, userId));
    } catch (rolesError) {
      console.error('Error deleting user roles:', rolesError);
      return NextResponse.json(
        { error: 'Failed to delete user roles: ' + (rolesError instanceof Error ? rolesError.message : 'Unknown error') },
        { status: 500 }
      );
    }

    // Delete from profiles table
    try {
      await database
        .delete(profiles)
        .where(eq(profiles.id, userId));
    } catch (profileError) {
      console.error('Error deleting profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to delete profile: ' + (profileError instanceof Error ? profileError.message : 'Unknown error') },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in delete user endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
