import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ship, MapPin, Heart, Fuel, Save, AlertCircle, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type CrewStatus = Database['public']['Tables']['crew_status']['Row'];
type StarSystem = Database['public']['Tables']['star_citizen_systems']['Row'];

export function CrewStatusPanel() {
  const { profile } = useAuth();
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [status, setStatus] = useState<CrewStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const [systemsResult, statusResult] = await Promise.all([
        supabase.from('star_citizen_systems').select('*').order('name'),
        supabase.from('crew_status').select('*').eq('user_id', profile.id).maybeSingle(),
      ]);

      if (systemsResult.error) throw systemsResult.error;
      if (statusResult.error) throw statusResult.error;

      setSystems(systemsResult.data || []);

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
      setMessage({ type: 'error', text: 'Failed to load status data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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

  const handleCheckboxChange = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading crew status...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Ship className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">My Crew Status</h2>
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
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Current System
            </label>
            <select
              value={formData.current_system_id}
              onChange={(e) => setFormData(prev => ({ ...prev, current_system_id: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Status'}
        </button>
      </div>
    </div>
  );
}
