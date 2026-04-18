import { NextResponse } from 'next/server';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getOpenReimbursements } from '@/lib/data/reimbursement-queries';

export async function GET() {
  try {
    await requireOfficerRole();
    const rows = await getOpenReimbursements();
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
