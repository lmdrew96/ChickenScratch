'use client';

import Link from 'next/link';
import { Settings, Users, BarChart3, Shield } from 'lucide-react';

interface AdminToolsProps {
  hasAdminAccess: boolean;
  stats?: {
    totalUsers: number;
    committeeMembers: number;
    pendingSubmissions: number;
  };
}

export function AdminTools({ hasAdminAccess, stats }: AdminToolsProps) {
  if (!hasAdminAccess) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Admin Tools
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin"
          className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-white/10 p-2 group-hover:bg-white/20 transition-colors">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-white">Admin Dashboard</h3>
          </div>
          <p className="text-sm text-slate-300">
            Access full admin panel for system configuration and management
          </p>
        </Link>

        <Link
          href="/admin"
          className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-white/10 p-2 group-hover:bg-white/20 transition-colors">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-white">User Management</h3>
          </div>
          <p className="text-sm text-slate-300">
            Manage user roles, permissions, and committee assignments
          </p>
        </Link>
      </div>

      {stats && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-white" />
            <h3 className="font-semibold text-white">Quick Stats</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
              <div className="text-xs text-slate-400">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.committeeMembers}</div>
              <div className="text-xs text-slate-400">Committee Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.pendingSubmissions}</div>
              <div className="text-xs text-slate-400">Pending Reviews</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
