import { NextResponse } from 'next/server'
import { updateUserRole } from '../../lib/roles'

export async function POST(request) {
  const { userId, updates } = await request.json()
  
  const { data, error } = await updateUserRole(userId, updates)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  return NextResponse.json({ success: true, data })
}
