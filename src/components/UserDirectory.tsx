import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Award, Search, User as UserIcon, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  discord_username: string;
  role: string;
  verified: boolean;
  profile_picture: string | null;
  qualifications?: Qualification[];
}

interface Qualification {
  id: string;
  qualification_code: string;
  qualification_name: string;
  granted_at: string;
  granted_by_user?: {
    discord_username: string;
  };
}

export function UserDirectory() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();

    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    const qualificationsChannel = supabase
      .channel('qualifications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_qualifications' },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(qualificationsChannel);
    };
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, discord_username, role, verified, profile_picture')
        .eq('verified', true)
        .order('discord_username');

      if (usersError) throw usersError;

      const { data: qualificationsData, error: qualificationsError } = await supabase
        .from('user_qualifications')
        .select('*, granted_by_user:users!user_qualifications_granted_by_fkey(discord_username)')
        .order('granted_at', { ascending: false });

      if (qualificationsError) throw qualificationsError;

      const usersWithQualifications = usersData.map(user => ({
        ...user,
        qualifications: qualificationsData.filter(q => q.user_id === user.id),
      }));

      setUsers(usersWithQualifications);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDiscord = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-discord-members`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync Discord members');
      }

      setSyncMessage({
        type: 'success',
        text: `Synced ${result.total} members: ${result.created} created, ${result.updated} updated${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
      });

      await loadUsers();
    } catch (err: any) {
      console.error('Error syncing Discord members:', err);
      setSyncMessage({
        type: 'error',
        text: err.message || 'Failed to sync Discord members',
      });
    } finally {
      setSyncing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.discord_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ceo':
        return 'bg-purple-900/30 border-purple-500/50 text-purple-400';
      case 'administrator':
        return 'bg-red-900/30 border-red-500/50 text-red-400';
      case 'dispatcher':
        return 'bg-blue-900/30 border-blue-500/50 text-blue-400';
      default:
        return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading user directory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">User Directory</h2>
            <span className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 rounded-full text-sm">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
            </span>
          </div>
          <button
            onClick={handleSyncDiscord}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Discord'}
          </button>
        </div>

        {syncMessage && (
          <div className={`rounded-lg p-4 flex items-start border ${
            syncMessage.type === 'success'
              ? 'bg-green-500/10 border-green-500'
              : 'bg-red-500/10 border-red-500'
          }`}>
            {syncMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${syncMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {syncMessage.text}
            </p>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username..."
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="ceo">CEO</option>
              <option value="admin">Administrator</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="crew">Crew</option>
            </select>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No users found matching your criteria
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.discord_username}
                        className="w-16 h-16 rounded-full border-2 border-cyan-500/30 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-16 h-16 rounded-full border-2 border-cyan-500/30 bg-slate-800 flex items-center justify-center ${user.profile_picture ? 'hidden' : 'flex'}`}
                    >
                      <UserIcon className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-lg truncate mb-2">
                        {user.discord_username}
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-xs border uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {user.qualifications && user.qualifications.length > 0 && (
                    <div className="border-t border-slate-700 pt-3 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-semibold text-white">Qualifications</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.qualifications.map((qual) => (
                          <div
                            key={qual.id}
                            className="group relative"
                          >
                            <div className="px-2 py-1 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-400 font-mono cursor-help">
                              {qual.qualification_code}
                            </div>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                              <div className="font-semibold">{qual.qualification_name}</div>
                              {qual.granted_by_user && (
                                <div className="text-slate-400 mt-1">
                                  Granted by {qual.granted_by_user.discord_username}
                                </div>
                              )}
                              <div className="text-slate-500 text-xs mt-1">
                                {new Date(qual.granted_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
