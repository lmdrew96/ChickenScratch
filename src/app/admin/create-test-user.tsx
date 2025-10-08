'use client'

import { useState } from 'react'
import { createTestUser } from '@/lib/actions/roles'

type Position = 'BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief'

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

type CreatedUser = {
  id: string
  email: string
  password: string
}

export default function CreateTestUser({ onUserCreated }: { onUserCreated?: () => void } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true)
  const [isMember, setIsMember] = useState(true)
  const [roles, setRoles] = useState<('officer' | 'committee')[]>(['committee'])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null)
  const [showForm, setShowForm] = useState(false)

  function generatePassword() {
    // Generate a simple but secure password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  function toggleRole(role: 'officer' | 'committee') {
    setRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  function togglePosition(position: Position) {
    setPositions(prev =>
      prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const finalPassword = autoGeneratePassword ? generatePassword() : password

    if (!email || !finalPassword) {
      setError('Email and password are required')
      setLoading(false)
      return
    }

    if (roles.length === 0) {
      setError('Please select at least one role')
      setLoading(false)
      return
    }

    const result = await createTestUser({
      email,
      password: finalPassword,
      is_member: isMember,
      roles,
      positions,
    })

    setLoading(false)

    if (result.success && result.user) {
      setCreatedUser(result.user)
      // Reset form
      setEmail('')
      setPassword('')
      setAutoGeneratePassword(true)
      setIsMember(true)
      setRoles(['committee'])
      setPositions([])
      setShowForm(false)
      // Notify parent to refresh user list if callback provided
      onUserCreated?.()
    } else {
      setError(result.error || 'Failed to create user')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function dismissCreatedUser() {
    setCreatedUser(null)
  }

  return (
    <div className="mb-8">
      {/* Created User Display */}
      {createdUser && (
        <div className="mb-6 bg-green-900/20 border-2 border-green-500 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-green-400">✓ Test User Created Successfully!</h3>
            <button
              onClick={dismissCreatedUser}
              className="text-green-400 hover:text-green-300 font-bold"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-1">Email:</label>
              <div className="flex gap-2">
                <code className="flex-1 bg-black/30 px-3 py-2 rounded border border-green-500/30 text-sm text-white">
                  {createdUser.email}
                </code>
                <button
                  onClick={() => copyToClipboard(createdUser.email)}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-1">Temporary Password:</label>
              <div className="flex gap-2">
                <code className="flex-1 bg-black/30 px-3 py-2 rounded border border-green-500/30 text-sm font-mono text-white">
                  {createdUser.password}
                </code>
                <button
                  onClick={() => copyToClipboard(createdUser.password)}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => copyToClipboard(`${createdUser.email}\n${createdUser.password}`)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              >
                Copy Both
              </button>
            </div>
          </div>
          
          <p className="text-sm text-green-300 mt-4 italic">
            💡 Save these credentials! The user should change their password on first login.
          </p>
        </div>
      )}

      {/* Toggle Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Create Test User
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-900/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Create Test User</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-300 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block font-medium mb-1 text-white">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test-user@test.com"
                className="w-full px-3 py-2 border border-white/20 rounded bg-black/30 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={autoGeneratePassword}
                  onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-medium text-white">Auto-generate secure password</span>
              </label>
              
              {!autoGeneratePassword && (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-white/20 rounded bg-black/30 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={!autoGeneratePassword}
                />
              )}
            </div>

            {/* Member Status */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={(e) => setIsMember(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-medium text-white">Is Member</span>
              </label>
            </div>

            {/* Roles */}
            <div>
              <label className="block font-medium mb-2 text-white">Roles *</label>
              <div className="space-y-2 ml-4">
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={roles.includes('officer')}
                    onChange={() => toggleRole('officer')}
                    className="w-4 h-4"
                  />
                  Officer
                </label>
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={roles.includes('committee')}
                    onChange={() => toggleRole('committee')}
                    className="w-4 h-4"
                  />
                  Committee
                </label>
              </div>
            </div>

            {/* Positions */}
            {roles.length > 0 && (
              <div>
                <label className="block font-medium mb-2 text-white">Positions</label>
                
                {roles.includes('officer') && (
                  <div className="ml-4 mb-3">
                    <p className="text-sm text-gray-300 mb-2">Officer Positions:</p>
                    <div className="space-y-1">
                      {OFFICER_POSITIONS.map(position => (
                        <label key={position} className="flex items-center gap-2 text-white">
                          <input
                            type="checkbox"
                            checked={positions.includes(position)}
                            onChange={() => togglePosition(position)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{position}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {roles.includes('committee') && (
                  <div className="ml-4">
                    <p className="text-sm text-gray-300 mb-2">Committee Positions:</p>
                    <div className="space-y-1">
                      {COMMITTEE_POSITIONS.map(position => (
                        <label key={position} className="flex items-center gap-2 text-white">
                          <input
                            type="checkbox"
                            checked={positions.includes(position)}
                            onChange={() => togglePosition(position)}
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

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Test User'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
