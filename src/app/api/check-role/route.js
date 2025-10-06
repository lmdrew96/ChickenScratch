import { NextResponse } from 'next/server'
import { checkUserRole } from '../../lib/roles'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  const role = await checkUserRole(userId)
  return NextResponse.json(role)
}
