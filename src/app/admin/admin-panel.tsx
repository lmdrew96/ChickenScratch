'use client'

import { useState, useMemo } from 'react'
import { updateUserRole } from '@/lib/actions/roles'
import { Trash2, Search, Filter } from 'lucide-react'

type Position = 'BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief'

type UserWithRole = {
  id: string
  email: string | null
  display_name?: string | null
  created_at?: string | null
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

const ALL_POSITIONS = [...OFFICER_POSITIONS, ...COMMITTEE_POSITIONS]

type SortOption = 'name-asc' | 'name-desc' | 'email-asc' | 'date-newest' | 'date-oldest'

export default function AdminPanel({ initialUsers }: { initialUsers: UserWithRole[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; email: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'officer' | 'committee' | 'editor' | 'admin'>('all')
  const [positionFilter, setPositionFilter] = useState<'all' | Position>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')

  // Filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(query) ||
        user.display_name?.toLowerCase().includes(query)
      )
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userRoles = user.roles || []
        const userPositions = user.positions || []
        
        switch (roleFilter) {
          case 'student':
            return userRoles.length === 0 && userPositions.length === 0
          case 'officer':
            return userRoles.includes('officer')
          case 'committee':
            return userRoles.includes('committee')
          case 'editor':
            return userPositions.includes('Editor-in-Chief')
          case 'admin':
            return userPositions.includes('BBEG') || userPositions.includes('Dictator-in-Chief')
          default:
            return true
        }
      })
    }

    // Apply position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.positions?.includes(positionFilter)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.display_name || a.email || '').localeCompare(b.display_name || b.email || '')
        case 'name-desc':
          return (b.display_name || b.email || '').localeCompare(a.display_name || a.email || '')
        case 'email-asc':
          return (a.email || '').localeCompare(b.email || '')
        case 'date-newest':
          return (b.created_at || '').localeCompare(a.created_at || '')
        case 'date-oldest':
          return (a.created_at || '').localeCompare(b.created_at || '')
        default:
          return 0
      }
    })

    return filtered
  }, [users, searchQuery, roleFilter, positionFilter, sortBy])

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

  async function handleDeleteUser(userId: string) {
    setDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId))
      setDeleteConfirm(null)
      alert('User deleted successfully')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-[var(--accent)]" />
          <h3 className="text-lg font-semibold text-white">Filter & Sort Users</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="officer">Officer</option>
              <option value="committee">Committee</option>
              <option value="editor">Editor-in-Chief</option>
              <option value="admin">Admin (BBEG/Dictator)</option>
            </select>
          </div>

          {/* Position Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Position
            </label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as typeof positionFilter)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="all">All Positions</option>
              {ALL_POSITIONS.map(position => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="email-asc">Email (A-Z)</option>
              <option value="date-newest">Created (Newest)</option>
              <option value="date-oldest">Created (Oldest)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          Showing {filteredAndSortedUsers.length} of {users.length} users
        </div>
      </div>

      {/* User List */}
      <div className="space-y-4">
        {filteredAndSortedUsers.map(user => {
          const userRoles = user.roles || []
          const userPositions = user.positions || []
          const isOfficer = userRoles.includes('officer')
          const isCommittee = userRoles.includes('committee')
          
          return (
            <div key={user.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-white">
                    {user.display_name || user.email}
                  </h3>
                  {user.display_name && (
                    <p className="text-sm text-gray-400">{user.email}</p>
                  )}
                </div>
                <button
                  onClick={() => setDeleteConfirm({ userId: user.id, email: user.email || 'Unknown' })}
                  disabled={loading || deleting}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete user"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Member Status */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={user.is_member || false}
                    onChange={(e) => handleRoleUpdate(user.id, { is_member: e.target.checked })}
                    disabled={loading}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="font-medium text-white">Is Member</span>
                </label>
                
                {/* Roles */}
                <div>
                  <h4 className="font-medium text-white mb-2">Roles:</h4>
                  <div className="space-y-2 ml-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isOfficer}
                        onChange={() => toggleRole(user.id, 'officer', userRoles)}
                        disabled={loading}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-gray-300">Officer</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isCommittee}
                        onChange={() => toggleRole(user.id, 'committee', userRoles)}
                        disabled={loading}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-gray-300">Committee</span>
                    </label>
                  </div>
                </div>
                
                {/* Positions */}
                {(isOfficer || isCommittee) && (
                  <div>
                    <h4 className="font-medium text-white mb-2">Positions:</h4>
                    
                    {isOfficer && (
                      <div className="ml-4 mb-3">
                        <p className="text-sm text-gray-400 mb-2">Officer Positions:</p>
                        <div className="space-y-1">
                          {OFFICER_POSITIONS.map(position => (
                            <label key={position} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={userPositions.includes(position)}
                                onChange={() => togglePosition(user.id, position, userPositions)}
                                disabled={loading}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-300">{position}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {isCommittee && (
                      <div className="ml-4">
                        <p className="text-sm text-gray-400 mb-2">Committee Positions:</p>
                        <div className="space-y-1">
                          {COMMITTEE_POSITIONS.map(position => (
                            <label key={position} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={userPositions.includes(position)}
                                onChange={() => togglePosition(user.id, position, userPositions)}
                                disabled={loading}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-300">{position}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Summary */}
                {(userRoles.length > 0 || userPositions.length > 0) && (
                  <div className="text-sm text-gray-400 pt-2 border-t border-white/10">
                    {userRoles.length > 0 && (
                      <p><strong className="text-gray-300">Current roles:</strong> {userRoles.join(', ')}</p>
                    )}
                    {userPositions.length > 0 && (
                      <p><strong className="text-gray-300">Current positions:</strong> {userPositions.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filteredAndSortedUsers.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-gray-400">No users found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg)] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Delete User</h3>
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete this user? This will permanently delete their account and all associated data.
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 font-medium">User: {deleteConfirm.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm.userId)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
