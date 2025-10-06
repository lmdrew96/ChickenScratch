'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { user } = useUser()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Check if current user is admin (BBEG or Dictator-in-Chief can both access)
  useEffect(() => {
    async function checkAccess() {
      if (!user) return
      
      const response = await fetch(`/api/check-role?userId=${user.id}`)
      const data = await response.json()
      
      if (data.position !== 'BBEG' && data.position !== 'Dictator-in-Chief') {
        router.push('/') // Redirect non-admins
      } else {
        fetchUsers()
      }
    }
    checkAccess()
  }, [user])

  async function fetchUsers() {
    // Fetch all users from Clerk
    const response = await fetch('/api/get-users')
    const data = await response.json()
    setUsers(data)
    setLoading(false)
  }

  async function updateRole(userId, updates) {
    const response = await fetch('/api/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates })
    })
    
    if (response.ok) {
      alert('Role updated!')
      fetchUsers()
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Manage Member Roles</h1>
      
      <div className="space-y-4">
        {users.map(user => (
          <div key={user.id} className="border p-4 rounded">
            <h3 className="font-bold">{user.email}</h3>
            
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={user.is_member}
                  onChange={(e) => updateRole(user.id, { is_member: e.target.checked })}
                />
                Is Member
              </label>
              
              <select
                value={user.role || ''}
                onChange={(e) => updateRole(user.id, { role: e.target.value || null })}
                className="border p-1"
              >
                <option value="">No Role</option>
                <option value="officer">Officer</option>
                <option value="committee">Committee</option>
              </select>
              
              {user.role === 'officer' && (
                <select
                  value={user.position || ''}
                  onChange={(e) => updateRole(user.id, { position: e.target.value })}
                  className="border p-1 ml-4"
                >
                  <option value="">Select Position</option>
                  <option value="BBEG">BBEG (President)</option>
                  <option value="Dictator-in-Chief">Dictator-in-Chief (VP)</option>
                  <option value="Scroll Gremlin">Scroll Gremlin (Secretary)</option>
                  <option value="Chief Hoarder">Chief Hoarder (Treasurer)</option>
                  <option value="PR Nightmare">PR Nightmare (PR Chair)</option>
                </select>
              )}
              
              {user.role === 'committee' && (
                <select
                  value={user.position || ''}
                  onChange={(e) => updateRole(user.id, { position: e.target.value })}
                  className="border p-1 ml-4"
                >
                  <option value="">Select Position</option>
                  <option value="Submissions Coordinator">Submissions Coordinator</option>
                  <option value="Proofreader">Proofreader</option>
                  <option value="Lead Design">Lead Design</option>
                  <option value="Editor-in-Chief">Editor-in-Chief</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
