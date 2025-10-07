import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'
import { getCurrentUserRole } from '@/lib/actions/roles'

export default async function TestRolePage() {
  const supabase = await createSupabaseServerReadOnlyClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get role data directly from database
  const { data: roleFromDB, error: roleError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user?.id || '')
    .single()
  
  // Get role data from action
  const roleFromAction = await getCurrentUserRole()
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Debug Info</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">User Info</h2>
          <p><strong>User ID:</strong> {user?.id || 'Not logged in'}</p>
          <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Role from Database (Direct Query)</h2>
          {roleError ? (
            <p className="text-red-600">Error: {roleError.message}</p>
          ) : (
            <pre className="bg-white p-2 rounded overflow-auto">
              {JSON.stringify(roleFromDB, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Role from Action (getCurrentUserRole)</h2>
          <pre className="bg-white p-2 rounded overflow-auto">
            {JSON.stringify(roleFromAction, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Role Information</h2>
          <p><strong>Roles:</strong> {roleFromAction?.roles ? roleFromAction.roles.join(', ') : 'none'}</p>
          <p><strong>Is Officer:</strong> {String(roleFromAction?.roles?.includes('officer'))}</p>
          <p><strong>Is Committee:</strong> {String(roleFromAction?.roles?.includes('committee'))}</p>
          <p><strong>Positions:</strong> {roleFromAction?.positions ? roleFromAction.positions.join(', ') : 'none'}</p>
          <p><strong>Is Admin (has BBEG or Dictator-in-Chief):</strong> {String(
            roleFromAction?.positions?.includes('BBEG') || 
            roleFromAction?.positions?.includes('Dictator-in-Chief')
          )}</p>
        </div>
      </div>
    </div>
  )
}
