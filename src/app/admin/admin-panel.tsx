'use client'

import { useState } from 'react'
import { updateUserRole } from '@/lib/actions/roles'

type Position = 'BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief'

type UserWithRole = {
  id: string
  email: string | null
  is_member?: boolean
  roles?: ('officer' | 'committee')[]
  positions?: Position[]
}

const OFFICER_POSITIONS: Position[] = [
  'BBEG',
  'Dictator-in-Chief',
  'Scroll Gremlin',
  'Chief Hoarder',
  'PR Nightmare'
]

const COMMITTEE_POSITIONS: Position[] = [
  'Submissions Coordinator',
  'Proofreader',
  'Lead Design',
  'Editor-in-Chief'
]

export default function AdminPanel({ initialUsers }: { initialUsers: UserWithRole[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState(false)

  async function handleRoleUpdate(
    userId: string, 
    updates: { 
      is_member?: boolean; 
      roles?: ('officer' | 'committee')[]; 
      positions?: Position[] 
    }
  ) {
    setLoading(true)
    
    const { error } = await updateUserRole(userId, updates)
    
    if (error) {
      alert('Error updating role: ' + error)
    } else {
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ))
    }
    
    setLoading(false)
  }

  function toggleRole(userId: string, role: 'officer' | 'committee', currentRoles: ('officer' | 'committee')[] = []) {
    const hasRole = currentRoles.includes(role)
    const newRoles = hasRole
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role]
    
    handleRoleUpdate(userId, { roles: newRoles })
  }

  function togglePosition(userId: string, position: Position, currentPositions: Position[] = []) {
    const hasPosition = currentPositions.includes(position)
    const newPositions = hasPosition
      ? currentPositions.filter(p => p !== position)
      : [...currentPositions, position]
    
    handleRoleUpdate(userId, { positions: newPositions })
  }

  return (
    <div className="space-y-4">
      {users.map(user => {
        const userRoles = user.roles || []
        const userPositions = user.positions || []
        const isOfficer = userRoles.includes('officer')
        const isCommittee = userRoles.includes('committee')
        
        return (
          <div key={user.id} className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">{user.email}</h3>
            
            <div className="space-y-4">
              {/* Member Status */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={user.is_member || false}
                  onChange={(e) => handleRoleUpdate(user.id, { is_member: e.target.checked })}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <span className="font-medium">Is Member</span>
              </label>
              
              {/* Roles */}
              <div>
                <h4 className="font-medium mb-2">Roles:</h4>
                <div className="space-y-2 ml-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isOfficer}
                      onChange={() => toggleRole(user.id, 'officer', userRoles)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    Officer
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isCommittee}
                      onChange={() => toggleRole(user.id, 'committee', userRoles)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    Committee
                  </label>
                </div>
              </div>
              
              {/* Positions */}
              {(isOfficer || isCommittee) && (
                <div>
                  <h4 className="font-medium mb-2">Positions:</h4>
                  
                  {isOfficer && (
                    <div className="ml-4 mb-3">
                      <p className="text-sm text-gray-600 mb-2">Officer Positions:</p>
                      <div className="space-y-1">
                        {OFFICER_POSITIONS.map(position => (
                          <label key={position} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={userPositions.includes(position)}
                              onChange={() => togglePosition(user.id, position, userPositions)}
                              disabled={loading}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{position}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {isCommittee && (
                    <div className="ml-4">
                      <p className="text-sm text-gray-600 mb-2">Committee Positions:</p>
                      <div className="space-y-1">
                        {COMMITTEE_POSITIONS.map(position => (
                          <label key={position} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={userPositions.includes(position)}
                              onChange={() => togglePosition(user.id, position, userPositions)}
                              disabled={loading}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{position}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Summary */}
              {(userRoles.length > 0 || userPositions.length > 0) && (
                <div className="text-sm text-gray-600 pt-2 border-t">
                  {userRoles.length > 0 && (
                    <p><strong>Current roles:</strong> {userRoles.join(', ')}</p>
                  )}
                  {userPositions.length > 0 && (
                    <p><strong>Current positions:</strong> {userPositions.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
