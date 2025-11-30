import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ship, MapPin, Heart, Fuel, Save, AlertCircle, CheckCircle, User, Award, Edit2, X, Plus } from 'lucide-react';
import type { Database } from '../lib/database.types';

type CrewStatus = Database['public']['Tables']['crew_status']['Row'];
type StarSystem = Database['public']['Tables']['star_citizen_systems']['Row'];

interface Qualification {
  id: string;
  user_id: string;
  qualification_code: string;
  qualification_name: string;
  granted_by: string | null;
  granted_at: string;
  granted_by_user?: {
    discord_username: string;
  };
}

const QUALIFICATIONS = [
  { code: 'P-BSC', name: 'Basic Pilot' },
  { code: 'P-MTC', name: 'Dropship' },
  { code: 'P-EWQ', name: 'Electronic Warfare' },
  { code: 'P-HVO', name: 'Heavy Ordinance' },
  { code: 'P-FTP', name: 'Fighter Pilot' },
];

export function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [status, setStatus] = useState<CrewStatus | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [editingProfilePicture, setEditingProfilePicture] = useState(false);
  const [newProfilePicture, setNewProfilePicture] = useState('');
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedQualification, setSelectedQualification] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; discord_username: string }[]>([]);

  const [formData, setFormData] = useState({
    ship_name: '',
    current_system_id: '',
    is_active: false,
    has_tier1_beds: false,
    has_tier2_beds: false,
    has_tier3_beds: false,
    has_quantum_fuel: false,
    has_hydrogen_fuel: false,
    notes: '',
  });

  useEffect(() => {
    loadData();
    if (profile?.role === 'administrator' || profile?.role === 'ceo') {
      loadUsers();
    }
  }, [profile]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, discord_username')
        .eq('verified', true)
        .order('discord_username');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const [systemsResult, statusResult, qualificationsResult] = await Promise.all([
        supabase.from('star_citizen_systems').select('*').order('name'),
        supabase.from('crew_status').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('user_qualifications').select('*, granted_by_user:users!user_qualifications_granted_by_fkey(discord_username)').eq('user_id', profile.id).order('granted_at', { ascending: false }),
      ]);

      if (systemsResult.error) throw systemsResult.error;
      if (statusResult.error) throw statusResult.error;
      if (qualificationsResult.error) throw qualificationsResult.error;

      setSystems(systemsResult.data || []);
      setQualifications(qualificationsResult.data || []);

      if (statusResult.data) {
        setStatus(statusResult.data);
        setFormData({
          ship_name: statusResult.data.ship_name,
          current_system_id: statusResult.data.current_system_id || '',
          is_active: statusResult.data.is_active,
          has_tier1_beds: statusResult.data.has_tier1_beds,
          has_tier2_beds: statusResult.data.has_tier2_beds,
          has_tier3_beds: statusResult.data.has_tier3_beds,
          has_quantum_fuel: statusResult.data.has_quantum_fuel,
          has_hydrogen_fuel: statusResult.data.has_hydrogen_fuel,
          notes: statusResult.data.notes,
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    try {
      const dataToSave = {
        user_id: profile.id,
        ...formData,
        current_system_id: formData.current_system_id || null,
      };

      if (status) {
        const { error } = await supabase
          .from('crew_status')
          .update(dataToSave)
          .eq('id', status.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crew_status')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Status updated successfully!' });
      await loadData();
    } catch (err: any) {
      console.error('Error saving status:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save status' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!profile || !newUsername.trim()) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ discord_username: newUsername.trim() })
        .eq('id', profile.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Username updated successfully!' });
      setEditingUsername(false);
      setNewUsername('');
      await refreshProfile();
    } catch (err: any) {
      console.error('Error updating username:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update username' });
    }
  };

  const handleUpdateProfilePicture = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_picture: newProfilePicture.trim() || null })
        .eq('id', profile.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
      setEditingProfilePicture(false);
      setNewProfilePicture('');
      await refreshProfile();
    } catch (err: any) {
      console.error('Error updating profile picture:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile picture' });
    }
  };

  const handleAddQualification = async () => {
    if (!selectedUser || !selectedQualification) return;

    try {
      const qual = QUALIFICATIONS.find(q => q.code === selectedQualification);
      if (!qual) return;

      const { error } = await supabase
        .from('user_qualifications')
        .insert([{
          user_id: selectedUser,
          qualification_code: qual.code,
          qualification_name: qual.name,
          granted_by: profile?.id,
        }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Qualification granted successfully!' });
      setShowQualificationModal(false);
      setSelectedUser('');
      setSelectedQualification('');

      if (selectedUser === profile?.id) {
        await loadData();
      }
    } catch (err: any) {
      console.error('Error adding qualification:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to add qualification' });
    }
  };

  const handleRemoveQualification = async (qualificationId: string) => {
    if (!confirm('Are you sure you want to remove this qualification?')) return;

    try {
      const { error } = await supabase
        .from('user_qualifications')
        .delete()
        .eq('id', qualificationId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Qualification removed successfully!' });
      await loadData();
    } catch (err: any) {
      console.error('Error removing qualification:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to remove qualification' });
    }
  };

  const handleCheckboxChange = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  const canManageQualifications = profile?.role === 'administrator' || profile?.role === 'ceo';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold text-white">My Profile</h2>
      </div>

      {message && (
        <div className={`rounded-lg p-4 flex items-start border ${
          message.type === 'success'
            ? 'bg-green-500/10 border-green-500'
            : 'bg-red-500/10 border-red-500'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" />
          Profile Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Username
            </label>
            {editingUsername ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={profile?.discord_username}
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button
                  onClick={handleUpdateUsername}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setEditingUsername(false);
                    setNewUsername('');
                  }}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  {profile?.discord_username}
                </div>
                <button
                  onClick={() => {
                    setEditingUsername(true);
                    setNewUsername(profile?.discord_username || '');
                  }}
                  className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Profile Picture URL
            </label>
            {editingProfilePicture ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProfilePicture}
                  onChange={(e) => setNewProfilePicture(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button
                  onClick={handleUpdateProfilePicture}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setEditingProfilePicture(false);
                    setNewProfilePicture('');
                  }}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white truncate">
                  {profile?.profile_picture || 'No profile picture set'}
                </div>
                <button
                  onClick={() => {
                    setEditingProfilePicture(true);
                    setNewProfilePicture(profile?.profile_picture || '');
                  }}
                  className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Qualifications
            </h4>
            {canManageQualifications && (
              <button
                onClick={() => setShowQualificationModal(true)}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Grant Qualification
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {qualifications.length === 0 ? (
              <div className="col-span-full text-slate-400 text-center py-4">
                No qualifications yet
              </div>
            ) : (
              qualifications.map((qual) => (
                <div key={qual.id} className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-cyan-400 font-bold text-sm">{qual.qualification_code}</div>
                      <div className="text-white text-xs">{qual.qualification_name}</div>
                      {qual.granted_by_user && (
                        <div className="text-slate-500 text-xs mt-1">
                          Granted by {qual.granted_by_user.discord_username}
                        </div>
                      )}
                    </div>
                    {canManageQualifications && (
                      <button
                        onClick={() => handleRemoveQualification(qual.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Remove qualification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Ship className="w-5 h-5 text-cyan-400" />
          Crew Status
        </h3>

        <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={() => handleCheckboxChange('is_active')}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600"
            />
            <span className="text-lg font-semibold text-white">Currently On Duty</span>
          </label>
          {formData.is_active && (
            <span className="ml-auto px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full">
              Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Ship Name/Type
            </label>
            <input
              type="text"
              value={formData.ship_name}
              onChange={(e) => setFormData(prev => ({ ...prev, ship_name: e.target.value }))}
              placeholder="e.g., Cutlass Red, Apollo Medivac"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Current System
            </label>
            <select
              value={formData.current_system_id}
              onChange={(e) => setFormData(prev => ({ ...prev, current_system_id: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Not in a system</option>
              {systems.map(system => (
                <option key={system.id} value={system.id}>
                  {system.name} ({system.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Medical Capabilities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
              <input
                type="checkbox"
                checked={formData.has_tier1_beds}
                onChange={() => handleCheckboxChange('has_tier1_beds')}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
              <span className="text-white">Tier 1 Beds</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
              <input
                type="checkbox"
                checked={formData.has_tier2_beds}
                onChange={() => handleCheckboxChange('has_tier2_beds')}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
              <span className="text-white">Tier 2 Beds</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
              <input
                type="checkbox"
                checked={formData.has_tier3_beds}
                onChange={() => handleCheckboxChange('has_tier3_beds')}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
              <span className="text-white">Tier 3 Beds</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-yellow-400" />
            Refueling Capabilities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
              <input
                type="checkbox"
                checked={formData.has_quantum_fuel}
                onChange={() => handleCheckboxChange('has_quantum_fuel')}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
              <span className="text-white">Quantum Fuel</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors">
              <input
                type="checkbox"
                checked={formData.has_hydrogen_fuel}
                onChange={() => handleCheckboxChange('has_hydrogen_fuel')}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
              <span className="text-white">Hydrogen Fuel</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Any additional information about your current status or capabilities..."
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
          />
        </div>

        <button
          onClick={handleSaveStatus}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Status'}
        </button>
      </div>

      {showQualificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Grant Qualification</h3>
              <button
                onClick={() => {
                  setShowQualificationModal(false);
                  setSelectedUser('');
                  setSelectedQualification('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select a user</option>
                  {allUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.discord_username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Qualification
                </label>
                <select
                  value={selectedQualification}
                  onChange={(e) => setSelectedQualification(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select a qualification</option>
                  {QUALIFICATIONS.map(qual => (
                    <option key={qual.code} value={qual.code}>
                      {qual.code} - {qual.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddQualification}
                disabled={!selectedUser || !selectedQualification}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Grant Qualification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
