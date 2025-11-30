import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Globe, Package, AlertCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type ServiceType = Database['public']['Tables']['service_types']['Row'];
type StarSystem = Database['public']['Tables']['star_citizen_systems']['Row'];

export function SettingsPanel() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [servicesResult, systemsResult] = await Promise.all([
        supabase.from('service_types').select('*').order('name'),
        supabase.from('star_citizen_systems').select('*').order('name'),
      ]);

      if (servicesResult.error) throw servicesResult.error;
      if (systemsResult.error) throw systemsResult.error;

      setServiceTypes(servicesResult.data || []);
      setSystems(systemsResult.data || []);
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceActive = async (serviceId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('service_types')
        .update({ is_active: !currentState })
        .eq('id', serviceId);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Error toggling service:', err);
      setError(err.message || 'Failed to update service');
    }
  };

  const toggleSystemActive = async (systemId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('star_citizen_systems')
        .update({ is_active: !currentState })
        .eq('id', systemId);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Error toggling system:', err);
      setError(err.message || 'Failed to update system');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 pt-20 md:pt-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,1)]" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent uppercase tracking-wide">System Settings</h2>
        </div>

        {error && (
          <div className="bg-red-900/20 border-2 border-red-500/50 clip-corners p-4 flex items-start mb-6 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm uppercase tracking-wider">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-slate-900/70 to-black/70 border-2 border-cyan-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <h3 className="text-xl font-bold text-cyan-400 uppercase tracking-wide">Star Systems</h3>
            </div>
            <p className="text-cyan-100/60 text-sm mb-6 uppercase tracking-wider">
              Control which star systems are available for service requests
            </p>
            <div className="space-y-3">
              {systems.map(system => (
                <div
                  key={system.id}
                  className="flex items-center justify-between p-4 bg-black/50 border border-cyan-500/20 clip-corners"
                >
                  <div>
                    <h4 className="text-white font-medium text-sm">{system.name}</h4>
                    <p className="text-slate-400 text-xs">Code: {system.code}</p>
                  </div>
                  <button
                    onClick={() => toggleSystemActive(system.id, system.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      system.is_active ? 'bg-green-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        system.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/70 to-black/70 border-2 border-cyan-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <h3 className="text-xl font-bold text-cyan-400 uppercase tracking-wide">Service Types</h3>
            </div>
            <p className="text-cyan-100/60 text-sm mb-6 uppercase tracking-wider">
              Control which services are available for requests
            </p>
            <div className="space-y-3">
              {serviceTypes.map(service => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-black/50 border border-cyan-500/20 clip-corners"
                >
                  <div>
                    <h4 className="text-white font-medium text-sm">{service.name}</h4>
                    {service.description && (
                      <p className="text-slate-400 text-xs">{service.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleServiceActive(service.id, service.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      service.is_active ? 'bg-green-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        service.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
