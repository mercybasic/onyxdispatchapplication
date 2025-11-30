import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  MapPin,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Ship
} from 'lucide-react';
import type { Database } from '../lib/database.types';
import { CrewStatusPanel } from './CrewStatusPanel';
import { RequestMessaging } from './RequestMessaging';

type ServiceRequest = Database['public']['Tables']['service_requests']['Row'] & {
  service_types: { name: string } | null;
  star_citizen_systems: { name: string; code: string } | null;
  users: { discord_username: string } | null;
};

type RequestNote = Database['public']['Tables']['request_notes']['Row'] & {
  users: { discord_username: string } | null;
};

type UserProfile = Database['public']['Tables']['users']['Row'];
type CrewStatus = Database['public']['Tables']['crew_status']['Row'] & {
  users: { discord_username: string } | null;
  star_citizen_systems: { name: string; code: string } | null;
};

const STATUS_COLORS = {
  pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
  assigned: 'bg-cyan-900/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
  in_progress: 'bg-blue-900/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
  completed: 'bg-green-900/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
  cancelled: 'bg-red-900/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
};

const PRIORITY_COLORS = {
  low: 'bg-slate-800/50 text-slate-400 border border-slate-600/50',
  medium: 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/50',
  high: 'bg-orange-900/20 text-orange-400 border border-orange-500/50',
  critical: 'bg-red-900/20 text-red-400 border border-red-500/50 animate-pulse',
};

export function DispatchDashboard() {
  const { profile, signOut } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [crew, setCrew] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, RequestNote[]>>({});
  const [newNote, setNewNote] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'requests' | 'status'>('requests');
  const [activeCrew, setActiveCrew] = useState<CrewStatus[]>([]);

  useEffect(() => {
    loadDashboardData();

    const requestsSubscription = supabase
      .channel('service_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, (payload) => {
        console.log('Service request change detected:', payload);
        loadRequests();
      })
      .subscribe((status) => {
        console.log('Requests subscription status:', status);
      });

    const crewSubscription = supabase
      .channel('crew_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_status' }, (payload) => {
        console.log('Crew status change detected:', payload);
        loadActiveCrew();
      })
      .subscribe((status) => {
        console.log('Crew subscription status:', status);
      });

    return () => {
      supabase.removeChannel(requestsSubscription);
      supabase.removeChannel(crewSubscription);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([loadRequests(), loadCrew(), loadActiveCrew()]);
    setLoading(false);
  };

  const loadActiveCrew = async () => {
    try {
      const { data, error } = await supabase
        .from('crew_status')
        .select(`
          *,
          users(discord_username),
          star_citizen_systems(name, code)
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setActiveCrew(data || []);
    } catch (err) {
      console.error('Error loading active crew:', err);
    }
  };

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          service_types(name),
          star_citizen_systems(name, code),
          users(discord_username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };

  const loadCrew = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('discord_username');

      if (error) throw error;
      setCrew(data || []);
    } catch (err) {
      console.error('Error loading crew:', err);
    }
  };


  const loadNotes = async (requestId: string) => {
    if (notes[requestId]) return;

    try {
      const { data, error } = await supabase
        .from('request_notes')
        .select(`
          *,
          users(discord_username)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setNotes(prev => ({ ...prev, [requestId]: data || [] }));
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  };

  const updateRequest = async (requestId: string, updates: Partial<ServiceRequest>) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;
      await loadRequests();
    } catch (err) {
      console.error('Error updating request:', err);
    }
  };

  const addNote = async (requestId: string) => {
    if (!newNote.trim() || !profile) return;

    try {
      const { error } = await supabase
        .from('request_notes')
        .insert([{
          request_id: requestId,
          user_id: profile.id,
          note: newNote.trim(),
        }]);

      if (error) throw error;
      setNewNote('');
      delete notes[requestId];
      await loadNotes(requestId);
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const toggleExpanded = (requestId: string) => {
    if (expandedRequest === requestId) {
      setExpandedRequest(null);
    } else {
      setExpandedRequest(requestId);
      loadNotes(requestId);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return req.status !== 'completed' && req.status !== 'cancelled';
    return req.status === filter;
  });

  const statusCount = (status: string) => requests.filter(r => r.status === status).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="relative text-cyan-400 text-xl uppercase tracking-widest">Initializing Dispatch System...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <header className="relative bg-gradient-to-br from-slate-900/90 to-black/90 border-b-2 border-cyan-500/30 backdrop-blur-sm sticky top-0 z-40 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pl-16 md:pl-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <div className="absolute inset-0 bg-cyan-500/30 blur-lg"></div>
              <Ship className="relative w-10 h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,1)]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent uppercase tracking-wide">Onyx Services Dispatch</h1>
              <p className="text-cyan-400/60 text-xs sm:text-sm uppercase tracking-wider">Operator: {profile?.discord_username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveView(activeView === 'requests' ? 'status' : 'requests')}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 hover:from-cyan-800/50 hover:to-blue-800/50 border border-cyan-500/30 text-cyan-300 clip-corners transition-all text-sm shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            >
              {activeView === 'requests' ? (
                <>
                  <Ship className="w-4 h-4" />
                  <span className="hidden sm:inline">My Status</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Requests</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>


      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative">
        {activeView === 'status' ? (
          <CrewStatusPanel />
        ) : (
          <>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 clip-corners border-2 ${filter === 'all' ? 'bg-cyan-900/30 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-slate-900/50 border-cyan-500/20'} transition-all`}
          >
            <div className="text-2xl font-bold text-white">{requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length}</div>
            <div className="text-sm text-slate-300">Active Requests</div>
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`p-4 clip-corners border-2 ${filter === 'pending' ? 'bg-yellow-900/30 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-slate-900/50 border-cyan-500/20'} transition-all`}
          >
            <div className="text-2xl font-bold text-yellow-400">{statusCount('pending')}</div>
            <div className="text-sm text-slate-300">Pending</div>
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`p-4 clip-corners border-2 ${filter === 'assigned' ? 'bg-cyan-900/30 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-slate-900/50 border-cyan-500/20'} transition-all`}
          >
            <div className="text-2xl font-bold text-blue-400">{statusCount('assigned')}</div>
            <div className="text-sm text-slate-300">Assigned</div>
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`p-4 clip-corners border-2 ${filter === 'in_progress' ? 'bg-blue-900/30 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900/50 border-cyan-500/20'} transition-all`}
          >
            <div className="text-2xl font-bold text-purple-400">{statusCount('in_progress')}</div>
            <div className="text-sm text-slate-300">In Progress</div>
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`p-4 clip-corners border-2 ${filter === 'completed' ? 'bg-green-900/30 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-slate-900/50 border-cyan-500/20'} transition-all`}
          >
            <div className="text-2xl font-bold text-green-400">{statusCount('completed')}</div>
            <div className="text-sm text-slate-300">Completed</div>
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`p-4 clip-corners border-2 ${filter === 'cancelled' ? 'bg-red-900/30 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-slate-900/50 border-cyan-500/20'} transition-all`}
          >
            <div className="text-2xl font-bold text-red-400">{statusCount('cancelled')}</div>
            <div className="text-sm text-slate-300">Cancelled</div>
          </button>
        </div>

        {activeCrew.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners p-4 sm:p-6 mb-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <h3 className="text-base sm:text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Ship className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              Online Crew ({activeCrew.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeCrew.map(crew => (
                <div
                  key={crew.id}
                  className="bg-black/60 clip-corners p-3 border-2 border-cyan-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-white font-medium text-sm">
                          {crew.users?.discord_username}
                        </span>
                      </div>
                      {crew.ship_name && (
                        <p className="text-slate-400 text-xs mb-1">
                          Ship: {crew.ship_name}
                        </p>
                      )}
                      {crew.star_citizen_systems && (
                        <p className="text-slate-400 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {crew.star_citizen_systems.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {crew.has_tier1_beds && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                        T1 Bed
                      </span>
                    )}
                    {crew.has_tier2_beds && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                        T2 Bed
                      </span>
                    )}
                    {crew.has_tier3_beds && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                        T3 Bed
                      </span>
                    )}
                    {crew.has_quantum_fuel && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        Q-Fuel
                      </span>
                    )}
                    {crew.has_hydrogen_fuel && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        H-Fuel
                      </span>
                    )}
                  </div>
                  {crew.notes && (
                    <p className="text-slate-400 text-xs mt-2 italic line-clamp-2">
                      {crew.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div key={request.id} className="bg-gradient-to-br from-slate-900/70 to-black/70 border-2 border-cyan-500/30 clip-corners overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 clip-corners text-xs font-bold uppercase tracking-wider ${PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]}`}>
                        {request.priority.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 clip-corners border-2 text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-slate-400 text-sm">
                        {request.service_types?.name}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {request.client_name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {request.star_citizen_systems?.name} - {request.location_details}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {request.client_discord}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(request.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpanded(request.id)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedRequest === request.id ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>

                {request.description && (
                  <p className="text-cyan-100/80 text-sm mb-4 bg-black/50 p-3 border border-cyan-500/20 clip-corners">
                    {request.description}
                  </p>
                )}

                {request.service_types?.name === 'Escort' && (
                  <div className="mb-4 bg-blue-900/10 border-2 border-blue-500/30 clip-corners p-4">
                    <h4 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-3">Escort Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-cyan-400 font-semibold">Origin:</span>
                        <p className="text-white">{request.origin_location || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-cyan-400 font-semibold">Destination:</span>
                        <p className="text-white">{request.destination_location || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-cyan-400 font-semibold">Ship Requirements:</span>
                        <p className="text-white">{request.escort_ship_requirements || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-semibold">Status</label>
                    <select
                      value={request.status}
                      onChange={(e) => updateRequest(request.id, { status: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-semibold">Assign To</label>
                    <select
                      value={request.assigned_to || ''}
                      onChange={(e) => updateRequest(request.id, { assigned_to: e.target.value || null })}
                      className="w-full px-3 py-2 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    >
                      <option value="">Unassigned</option>
                      {crew.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.discord_username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-semibold">Priority</label>
                    <select
                      value={request.priority}
                      onChange={(e) => updateRequest(request.id, { priority: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {request.service_types?.name === 'Escort' && (
                  <div className="mt-4 bg-green-900/10 border-2 border-green-500/30 clip-corners p-4">
                    <h4 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-3">Price Quote (UEC)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-semibold">Quote Amount</label>
                        <input
                          type="number"
                          value={request.quoted_price_uec || ''}
                          onChange={(e) => updateRequest(request.id, {
                            quoted_price_uec: e.target.value ? parseFloat(e.target.value) : null,
                            price_status: e.target.value ? 'quoted' : 'pending_quote',
                            price_quoted_at: e.target.value ? new Date().toISOString() : null
                          })}
                          placeholder="Enter price"
                          className="w-full px-3 py-2 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-semibold">Price Status</label>
                        <div className={`px-3 py-2 clip-corners text-sm font-bold uppercase ${
                          request.price_status === 'accepted' ? 'bg-green-900/30 border-2 border-green-500/50 text-green-400' :
                          request.price_status === 'declined' ? 'bg-red-900/30 border-2 border-red-500/50 text-red-400' :
                          request.price_status === 'quoted' ? 'bg-yellow-900/30 border-2 border-yellow-500/50 text-yellow-400' :
                          'bg-slate-900/30 border-2 border-slate-500/50 text-slate-400'
                        }`}>
                          {request.price_status?.replace('_', ' ') || 'Pending Quote'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-semibold">Client Response</label>
                        <div className="text-cyan-100 text-sm px-3 py-2">
                          {request.price_responded_at
                            ? new Date(request.price_responded_at).toLocaleString()
                            : 'Awaiting response'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {expandedRequest === request.id && (
                <>
                  <RequestMessaging requestId={request.id} clientName={request.client_name} />

                  <div className="border-t-2 border-cyan-500/30 bg-black/30 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                      <h4 className="text-lg font-bold text-cyan-400 uppercase tracking-wide">Internal Notes</h4>
                    </div>

                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                      {notes[request.id]?.length > 0 ? (
                        notes[request.id].map(note => (
                          <div key={note.id} className="bg-black/60 p-3 border border-cyan-500/20 clip-corners">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-blue-400">
                                {note.users?.discord_username}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(note.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300">{note.note}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No internal notes yet</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add an internal note..."
                        className="flex-1 px-4 py-2 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] placeholder-cyan-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addNote(request.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => addNote(request.id)}
                        disabled={!newNote.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-700 text-white clip-corners text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No requests found</p>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
