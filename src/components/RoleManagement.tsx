import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, CheckCircle, XCircle, UserCog, Loader2, AlertTriangle } from 'lucide-react';

interface User {
  id: string;
  discord_username: string;
  discord_id: string;
  role: string;
  verified: boolean;
  created_at: string;
}

export function RoleManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [verifyingDiscord, setVerifyingDiscord] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      setUpdating(userId);
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (err) {
      console.error('Error updating role:', err);
    } finally {
      setUpdating(null);
    }
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdating(userId);
      const { error } = await supabase
        .from('users')
        .update({ verified: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (err) {
      console.error('Error updating verification:', err);
    } finally {
      setUpdating(null);
    }
  };

  const verifyWithDiscord = async (userId: string) => {
    try {
      setVerifyingDiscord(userId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-discord-roles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(`Verification failed: ${result.reason || result.error}`);
      } else {
        alert(`User verified! Role: ${result.assigned_role}, Verified: ${result.verified ? 'Yes' : 'No'}`);
      }

      await loadUsers();
    } catch (err: any) {
      console.error('Error verifying with Discord:', err);
      alert('Failed to verify with Discord: ' + err.message);
    } finally {
      setVerifyingDiscord(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ceo':
        return 'bg-purple-900/30 border-purple-500/50 text-purple-400';
      case 'dispatcher':
        return 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400';
      case 'administrator':
        return 'bg-blue-900/30 border-blue-500/50 text-blue-400';
      case 'crew':
        return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
      default:
        return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading users...</div>
      </div>
    );
  }

  if (profile?.role !== 'ceo') {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black"></div>
        <div className="max-w-4xl mx-auto relative w-full">
          <div className="bg-gradient-to-br from-red-900/50 to-black/50 border-2 border-red-500/50 clip-corners p-8 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-4 mb-4">
              <AlertTriangle className="w-12 h-12 text-red-400" />
              <div>
                <h2 className="text-2xl font-bold text-red-400 uppercase tracking-wider">Access Denied</h2>
                <p className="text-slate-300 mt-2">Role management is restricted to CEO level access only.</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 clip-corners">
              <p className="text-slate-400 text-sm">
                <strong className="text-red-400">Note:</strong> User roles are primarily assigned through Discord verification.
                Only CEO users have permission to manually override role assignments when necessary.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-7xl mx-auto relative w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <UserCog className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-cyan-400 uppercase tracking-wider">Role Management</h1>
          </div>
          <p className="text-slate-400">Manage user roles and verification status</p>
        </div>

        <div className="mb-6 p-4 bg-cyan-900/10 border-2 border-cyan-500/30 clip-corners">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-sm mb-1">Role Assignment Policy</h3>
              <p className="text-slate-300 text-sm">
                User roles should primarily be assigned through <strong className="text-cyan-400">Discord verification</strong>.
                Use the "Discord" button to sync roles from Discord server. Manual role changes here should only be used
                for emergency overrides or special circumstances.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-cyan-500/30">
                <tr>
                  <th className="text-left p-4 text-cyan-400 uppercase tracking-wider text-sm">User</th>
                  <th className="text-left p-4 text-cyan-400 uppercase tracking-wider text-sm">Discord ID</th>
                  <th className="text-left p-4 text-cyan-400 uppercase tracking-wider text-sm">Role</th>
                  <th className="text-center p-4 text-cyan-400 uppercase tracking-wider text-sm">Verified</th>
                  <th className="text-left p-4 text-cyan-400 uppercase tracking-wider text-sm">Joined</th>
                  <th className="text-right p-4 text-cyan-400 uppercase tracking-wider text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-cyan-500/10 hover:bg-cyan-900/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-sm flex items-center justify-center">
                          <UserCog className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-medium">{user.discord_username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-sm">{user.discord_id}</td>
                    <td className="p-4">
                      {updating === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className="bg-slate-900/50 border-2 border-cyan-500/30 text-white px-3 py-1.5 clip-corners focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                        >
                          <option value="crew">Crew</option>
                          <option value="administrator">Administrator</option>
                          <option value="dispatcher">Dispatcher</option>
                          <option value="ceo">CEO</option>
                        </select>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        {user.verified ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => verifyWithDiscord(user.id)}
                          disabled={verifyingDiscord === user.id || updating === user.id}
                          className="px-4 py-2 clip-corners border-2 bg-blue-900/30 border-blue-500/50 text-blue-400 hover:bg-blue-900/50 transition-all uppercase tracking-wider text-xs font-bold flex items-center gap-2"
                          title="Verify with Discord roles"
                        >
                          {verifyingDiscord === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Shield className="w-4 h-4" />
                              Discord
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => toggleVerification(user.id, user.verified)}
                          disabled={updating === user.id || verifyingDiscord === user.id}
                          className={`px-4 py-2 clip-corners border-2 ${
                            user.verified
                              ? 'bg-red-900/30 border-red-500/50 text-red-400 hover:bg-red-900/50'
                              : 'bg-green-900/30 border-green-500/50 text-green-400 hover:bg-green-900/50'
                          } transition-all uppercase tracking-wider text-xs font-bold flex items-center gap-2`}
                        >
                          {updating === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.verified ? (
                            <>
                              <XCircle className="w-4 h-4" />
                              Revoke
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Verify
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <UserCog className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">No users found</p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-2 border-cyan-500/30 clip-corners p-6">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-3">Role Descriptions</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-cyan-400 font-semibold min-w-[120px]">Dispatcher:</span>
              <span className="text-slate-300">Full system access, can manage all ships, crews, and settings</span>
            </div>
            <div className="flex gap-3">
              <span className="text-blue-400 font-semibold min-w-[120px]">Administrator:</span>
              <span className="text-slate-300">Can create and manage their own ships and assign crew members</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 font-semibold min-w-[120px]">Staff:</span>
              <span className="text-slate-300">Can be assigned to ships and perform day-to-day operations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
