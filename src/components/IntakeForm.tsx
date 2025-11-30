import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Rocket, AlertCircle, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type ServiceType = Database['public']['Tables']['service_types']['Row'];
type StarSystem = Database['public']['Tables']['star_citizen_systems']['Row'];

interface IntakeFormProps {
  onRequestSubmitted?: (trackingCode: string, clientName: string) => void;
}

export function IntakeForm({ onRequestSubmitted }: IntakeFormProps) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [error, setError] = useState('');
  const [avgWaitTime, setAvgWaitTime] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    service_type_id: '',
    system_id: '',
    client_name: '',
    client_discord: '',
    location_details: '',
    description: '',
    origin_location: '',
    destination_location: '',
    escort_ship_requirements: '',
  });

  useEffect(() => {
    loadFormData();
    loadAverageWaitTime();
  }, []);

  const loadFormData = async () => {
    try {
      const [servicesResult, systemsResult] = await Promise.all([
        supabase.from('service_types').select('*').eq('is_active', true).order('name'),
        supabase.from('star_citizen_systems').select('*').eq('is_active', true).order('name'),
      ]);

      if (servicesResult.error) throw servicesResult.error;
      if (systemsResult.error) throw systemsResult.error;

      setServiceTypes(servicesResult.data || []);
      setSystems(systemsResult.data || []);
    } catch (err) {
      console.error('Error loading form data:', err);
      setError('Failed to load form data. Please refresh the page.');
    }
  };

  const loadAverageWaitTime = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('service_requests')
        .select('created_at, completed_at')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .gte('completed_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        const totalMinutes = data.reduce((sum, request) => {
          const created = new Date(request.created_at).getTime();
          const completed = new Date(request.completed_at!).getTime();
          return sum + (completed - created) / 1000 / 60;
        }, 0);
        setAvgWaitTime(Math.round(totalMinutes / data.length));
      }
    } catch (err) {
      console.error('Error loading average wait time:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: newRequest, error: submitError } = await supabase
        .from('service_requests')
        .insert([formData])
        .select('tracking_code, id')
        .single();

      if (submitError) throw submitError;

      if (newRequest?.tracking_code) {
        setTrackingCode(newRequest.tracking_code);
      }

      const selectedService = serviceTypes.find(s => s.id === formData.service_type_id);
      const selectedSystem = systems.find(s => s.id === formData.system_id);

      if (selectedService && selectedSystem) {
        const notifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-discord`;

        try {
          await fetch(notifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              client_name: formData.client_name,
              client_discord: formData.client_discord,
              service_type: selectedService.name,
              system: selectedSystem.name,
              system_code: selectedSystem.code,
              location_details: formData.location_details,
              description: formData.description,
              tracking_code: newRequest.tracking_code,
              site_url: window.location.origin,
            }),
          });
        } catch (notifyError) {
          console.error('Failed to send Discord notification:', notifyError);
        }
      }

      if (onRequestSubmitted && newRequest?.tracking_code) {
        onRequestSubmitted(newRequest.tracking_code, formData.client_name);
      } else {
        setSubmitted(true);
        setFormData({
          service_type_id: '',
          system_id: '',
          client_name: '',
          client_discord: '',
          location_details: '',
          description: '',
          origin_location: '',
          destination_location: '',
          escort_ship_requirements: '',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const selectedService = serviceTypes.find(s => s.id === formData.service_type_id);
  const isEscortService = selectedService?.name === 'Escort';

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <div className="relative bg-gradient-to-br from-slate-900/90 to-black/90 backdrop-blur-sm border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] p-8 max-w-md w-full text-center clip-corners">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-sm flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-cyan-400 mb-2 tracking-wide uppercase">Request Transmitted</h2>
          <p className="text-slate-300 mb-4 text-sm">
            Your service request has been received and logged. Dispatch will establish contact via Discord momentarily.
          </p>

          {trackingCode && (
            <div className="bg-black/50 border-2 border-cyan-500/50 clip-corners p-6 mb-6">
              <p className="text-cyan-400/80 text-xs uppercase tracking-widest mb-2">Your Tracking Code</p>
              <p className="text-3xl font-bold text-cyan-400 tracking-widest font-mono mb-2">{trackingCode}</p>
              <p className="text-slate-400 text-xs">
                Save this code to track your request status and communicate with dispatch
              </p>
            </div>
          )}

          <button
            onClick={() => {
              setSubmitted(false);
              setTrackingCode('');
            }}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-8 clip-corners transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] uppercase tracking-wider text-sm"
          >
            New Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 md:px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-3xl mx-auto relative pt-16 md:pt-0">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="https://i.imgur.com/xYi56xK.png"
              alt="Onyx Services Logo"
              className="h-24 w-auto drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
            />
          </div>
          <p className="text-cyan-300/80 text-lg tracking-wide uppercase text-sm">Transmission Protocol: Service Request</p>
          {avgWaitTime !== null && (
            <div className="mt-6 inline-block bg-gradient-to-br from-slate-900/50 to-black/50 backdrop-blur-sm border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] clip-corners px-8 py-4">
              <p className="text-xs text-cyan-400/80 uppercase tracking-widest mb-1">Avg Response Time</p>
              <p className="text-3xl font-bold text-cyan-400 tracking-wider font-mono">
                {avgWaitTime < 60
                  ? `${avgWaitTime} MIN`
                  : `${Math.floor(avgWaitTime / 60)}H ${avgWaitTime % 60}M`}
              </p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-black/90 backdrop-blur-sm shadow-2xl p-8 border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] clip-corners">
          {error && (
            <div className="mb-6 bg-red-900/20 border-2 border-red-500/50 clip-corners p-4 flex items-start shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="service_type_id" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                  Service Type *
                </label>
                <select
                  id="service_type_id"
                  name="service_type_id"
                  required
                  value={formData.service_type_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none"
                >
                  <option value="">Select a service</option>
                  {serviceTypes.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="system_id" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                  System *
                </label>
                <select
                  id="system_id"
                  name="system_id"
                  required
                  value={formData.system_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none"
                >
                  <option value="">Select a system</option>
                  {systems.map(system => (
                    <option key={system.id} value={system.id}>
                      {system.name} ({system.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="client_name" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="client_name"
                  name="client_name"
                  required
                  value={formData.client_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="client_discord" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                  Discord Username *
                </label>
                <input
                  type="text"
                  id="client_discord"
                  name="client_discord"
                  required
                  value={formData.client_discord}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700"
                  placeholder="username#1234"
                />
              </div>
            </div>

            {isEscortService ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="origin_location" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                      Origin Location *
                    </label>
                    <input
                      type="text"
                      id="origin_location"
                      name="origin_location"
                      required={isEscortService}
                      value={formData.origin_location}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700"
                      placeholder="e.g., Port Olisar, Crusader"
                    />
                  </div>
                  <div>
                    <label htmlFor="destination_location" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                      Destination Location *
                    </label>
                    <input
                      type="text"
                      id="destination_location"
                      name="destination_location"
                      required={isEscortService}
                      value={formData.destination_location}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700"
                      placeholder="e.g., ArcCorp, Hurston"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="escort_ship_requirements" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                    Ship Requirements
                  </label>
                  <input
                    type="text"
                    id="escort_ship_requirements"
                    name="escort_ship_requirements"
                    value={formData.escort_ship_requirements}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700"
                    placeholder="e.g., 2x Fighters, 1x Gunship"
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="location_details" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                  Location Details *
                </label>
                <input
                  type="text"
                  id="location_details"
                  name="location_details"
                  required={!isEscortService}
                  value={formData.location_details}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700"
                  placeholder="e.g., Crusader orbit, Port Olisar vicinity"
                />
              </div>
            )}

            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                Additional Details
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none resize-none placeholder-cyan-700"
                placeholder="Provide any additional information about your request..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-700 text-white font-bold py-4 px-6 clip-corners transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] uppercase tracking-widest text-sm"
            >
              {loading ? 'Transmitting...' : 'Submit Service Request'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-cyan-600/60 text-xs uppercase tracking-widest">
            Emergency Protocol: Direct Discord Channel
          </p>
        </div>

         <div className="mt-6 text-center">
          <a
            href="https://discord.gg/onyxi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-8 clip-corners transition-all duration-200 shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(99,102,241,0.7)] uppercase tracking-widest text-sm"
          >
            Join Our Discord
          </a>
          <p className="text-slate-400 text-xs mt-3">
            Connect with our community today
          </p>
        </div>
      </div>
    </div>
  );
}
