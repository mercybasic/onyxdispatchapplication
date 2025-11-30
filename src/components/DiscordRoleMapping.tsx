import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Plus, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface RoleMapping {
  id: string;
  discord_role_id: string;
  discord_role_name: string;
  system_role: string;
  auto_verify: boolean;
  created_at: string;
}

export function DiscordRoleMapping() {
  const [mappings, setMappings] = useState<RoleMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    discord_role_id: '',
    discord_role_name: '',
    system_role: 'crew',
    auto_verify: true,
  });

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discord_role_mappings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMappings(data || []);
    } catch (err) {
      console.error('Error loading mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('discord_role_mappings').insert([formData]);

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        discord_role_id: '',
        discord_role_name: '',
        system_role: 'crew',
        auto_verify: true,
      });
      await loadMappings();
    } catch (err: any) {
      console.error('Error adding mapping:', err);
      alert('Failed to add role mapping: ' + err.message);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Delete this role mapping?')) return;

    try {
      const { error } = await supabase
        .from('discord_role_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadMappings();
    } catch (err: any) {
      console.error('Error deleting mapping:', err);
      alert('Failed to delete mapping: ' + err.message);
    }
  };

  const toggleAutoVerify = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('discord_role_mappings')
        .update({ auto_verify: !currentState })
        .eq('id', id);

      if (error) throw error;
      await loadMappings();
    } catch (err: any) {
      console.error('Error toggling auto-verify:', err);
      alert('Failed to update: ' + err.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'dispatcher':
        return 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400';
      case 'administrator':
        return 'bg-blue-900/30 border-blue-500/50 text-blue-400';
      case 'crew':
        return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
      case 'ceo':
        return 'bg-purple-900/30 border-purple-500/50 text-purple-400';
      default:
        return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-6xl mx-auto relative w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl font-bold text-cyan-400 uppercase tracking-wider">Discord Role Mapping</h1>
            </div>
            <p className="text-slate-400">Map Discord roles to system roles for automatic verification</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold clip-corners transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] uppercase tracking-wider"
          >
            <Plus className="w-5 h-5" />
            Add Mapping
          </button>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-cyan-500/30">
                <tr>
                  <th className="text-left p-4 text-cyan-400 uppercase tracking-wider text-sm">Discord Role</th>
                  <th className="text-left p-4 text-cyan-400 uppercase tracking-wider text-sm">Role ID</th>
                  <th className="text-left p-4 text-cyan-400 uppercase tracking-wider text-sm">System Role</th>
                  <th className="text-center p-4 text-cyan-400 uppercase tracking-wider text-sm">Auto-Verify</th>
                  <th className="text-right p-4 text-cyan-400 uppercase tracking-wider text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.id} className="border-b border-cyan-500/10 hover:bg-cyan-900/10 transition-colors">
                    <td className="p-4">
                      <span className="text-white font-medium">{mapping.discord_role_name}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-400 font-mono text-sm">{mapping.discord_role_id}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 clip-corners border ${getRoleBadgeColor(mapping.system_role)} text-xs uppercase tracking-wider font-bold`}>
                        {mapping.system_role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleAutoVerify(mapping.id, mapping.auto_verify)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          {mapping.auto_verify ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeleteMapping(mapping.id)}
                          className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border-2 border-red-500/50 text-red-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mappings.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">No role mappings configured</p>
              <p className="text-slate-600 text-sm mt-2">Add a mapping to enable Discord role verification</p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-2 border-cyan-500/30 clip-corners p-6">
          <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-3">How to Find Discord Role IDs</h3>
          <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
            <li>Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)</li>
            <li>Right-click on a role in Server Settings → Roles</li>
            <li>Click "Copy ID" to get the role ID</li>
            <li>Paste the ID here along with a friendly name for the role</li>
          </ol>
          <div className="mt-4 p-3 bg-cyan-900/10 border-l-4 border-cyan-500 text-xs text-slate-400">
            <strong className="text-cyan-400">Note:</strong> When multiple Discord roles match, the highest priority system role will be assigned (Dispatcher &gt; Administrator &gt; Staff)
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900/95 to-black/95 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.4)] p-8 max-w-md w-full clip-corners">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6 uppercase tracking-wider">Add Role Mapping</h2>

            <form onSubmit={handleAddMapping} className="space-y-4">
              <div>
                <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Discord Role Name *</label>
                <input
                  type="text"
                  value={formData.discord_role_name}
                  onChange={(e) => setFormData({ ...formData, discord_role_name: e.target.value })}
                  required
                  placeholder="e.g., Fleet Commander"
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Discord Role ID *</label>
                <input
                  type="text"
                  value={formData.discord_role_id}
                  onChange={(e) => setFormData({ ...formData, discord_role_id: e.target.value })}
                  required
                  placeholder="e.g., 123456789012345678"
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">System Role *</label>
                <select
                  value={formData.system_role}
                  onChange={(e) => setFormData({ ...formData, system_role: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="crew">Crew</option>
                  <option value="administrator">Administrator</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="ceo">CEO</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto_verify"
                  checked={formData.auto_verify}
                  onChange={(e) => setFormData({ ...formData, auto_verify: e.target.checked })}
                  className="w-5 h-5 bg-slate-900/50 border-2 border-cyan-500/30 clip-corners"
                />
                <label htmlFor="auto_verify" className="text-slate-300 text-sm">
                  Auto-verify users with this role
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      discord_role_id: '',
                      discord_role_name: '',
                      system_role: 'crew',
                      auto_verify: true,
                    });
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 clip-corners transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 clip-corners transition-all uppercase tracking-wider"
                >
                  Add Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
