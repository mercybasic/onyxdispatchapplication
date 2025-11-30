import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Send, MessageCircle, AlertCircle, Loader2, User, UserCog, Home, XCircle } from 'lucide-react';

interface ServiceRequest {
  id: string;
  tracking_code: string;
  client_name: string;
  client_discord: string;
  status: string;
  priority: string;
  location_details: string;
  description: string;
  created_at: string;
  completed_at: string | null;
  service_types: { name: string };
  star_citizen_systems: { name: string; code: string };
  users: { discord_username: string } | null;
  origin_location: string | null;
  destination_location: string | null;
  escort_ship_requirements: string | null;
  quoted_price_uec: number | null;
  price_status: string | null;
  price_quoted_at: string | null;
  price_responded_at: string | null;
}

interface Message {
  id: string;
  request_id: string;
  sender_type: 'client' | 'dispatcher';
  sender_name: string;
  message: string;
  created_at: string;
}

interface ClientTrackerProps {
  initialTrackingCode?: string;
  initialClientName?: string;
}

export function ClientTracker({ initialTrackingCode, initialClientName }: ClientTrackerProps = {}) {
  const [trackingCode, setTrackingCode] = useState(initialTrackingCode || '');
  const [clientName, setClientName] = useState(initialClientName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const performSearch = async () => {
    setLoading(true);
    setError('');
    setRequest(null);
    setMessages([]);

    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          service_types(name),
          star_citizen_systems(name, code),
          users(discord_username)
        `)
        .eq('tracking_code', trackingCode.toUpperCase())
        .eq('client_name', clientName)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('No request found with that tracking code and name. Please check your details and try again.');
      } else {
        setRequest(data as ServiceRequest);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingCode && initialClientName) {
      performSearch();
    }
  }, []);

  useEffect(() => {
    if (request) {
      loadMessages();
      scrollToBottom();

      const channel = supabase
        .channel(`request:${request.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'request_messages',
            filter: `request_id=eq.${request.id}`,
          },
          (payload) => {
            console.log('New message received:', payload);
            setMessages(prev => [...prev, payload.new as Message]);
            setTimeout(scrollToBottom, 100);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'service_requests',
            filter: `id=eq.${request.id}`,
          },
          async (payload) => {
            console.log('Request update received:', payload);
            const { data } = await supabase
              .from('service_requests')
              .select(`
                *,
                service_types(name),
                star_citizen_systems(name, code),
                users(discord_username)
              `)
              .eq('id', request.id)
              .maybeSingle();

            if (data) {
              setRequest(data as ServiceRequest);
            }
          }
        )
        .subscribe((status) => {
          console.log('Client tracker subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [request]);

  const loadMessages = async () => {
    if (!request) return;

    try {
      const { data, error } = await supabase
        .from('request_messages')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !request) return;

    setSending(true);

    try {
      const { error } = await supabase
        .from('request_messages')
        .insert([{
          request_id: request.id,
          sender_type: 'client',
          sender_name: request.client_name,
          message: newMessage.trim(),
        }]);

      if (error) throw error;

      setNewMessage('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handlePriceResponse = async (accepted: boolean) => {
    if (!request) return;

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          price_status: accepted ? 'accepted' : 'declined',
          price_responded_at: new Date().toISOString(),
        })
        .eq('tracking_code', request.tracking_code)
        .eq('client_name', request.client_name);

      if (error) throw error;

      setRequest({
        ...request,
        price_status: accepted ? 'accepted' : 'declined',
        price_responded_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error responding to price:', err);
      setError('Failed to respond to price quote. Please try again.');
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelReason || !request) return;

    setCancelling(true);
    try {
      await supabase.from('cancellation_reasons').insert([{
        request_id: request.id,
        reason: cancelReason,
        additional_details: cancelDetails.trim() || null,
        cancelled_by: 'client',
      }]);

      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ status: 'cancelled' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      setRequest({ ...request, status: 'cancelled' });
      setShowCancelModal(false);
      setCancelReason('');
      setCancelDetails('');
    } catch (err: any) {
      console.error('Error cancelling request:', err);
      setError('Failed to cancel request. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
      case 'in_progress':
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-900/20';
      case 'completed':
        return 'text-green-400 border-green-500/30 bg-green-900/20';
      case 'cancelled':
        return 'text-red-400 border-red-500/30 bg-red-900/20';
      default:
        return 'text-slate-400 border-slate-500/30 bg-slate-900/20';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!request) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <div className="relative bg-gradient-to-br from-slate-900/90 to-black/90 backdrop-blur-sm border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] p-8 max-w-md w-full clip-corners">
          <button
            onClick={() => window.location.href = '/'}
            className="absolute top-4 right-4 text-cyan-400 hover:text-cyan-300 transition-colors p-2 hover:bg-cyan-900/20 rounded"
            title="Back to Homepage"
          >
            <Home className="w-5 h-5" />
          </button>
          <div className="text-center mb-6">
            <img
              src="https://i.imgur.com/xYi56xK.png"
              alt="Onyx Services Logo"
              className="h-16 w-auto mx-auto mb-4 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
            />
            <h2 className="text-2xl font-bold text-cyan-400 mb-2 tracking-wide uppercase">Track Your Request</h2>
            <p className="text-slate-400 text-sm">Enter your tracking code and name to view status and communicate with dispatch</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-900/20 border-2 border-red-500/50 clip-corners p-4 flex items-start shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="tracking_code" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                Tracking Code *
              </label>
              <input
                type="text"
                id="tracking_code"
                required
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700 font-mono text-lg tracking-widest text-center"
                placeholder="XXXXXXXX"
              />
            </div>

            <div>
              <label htmlFor="client_name" className="block text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-widest">
                Your Name *
              </label>
              <input
                type="text"
                id="client_name"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700"
                placeholder="Enter your name"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-700 text-white font-bold py-4 px-6 clip-corners transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Track Request
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-6xl mx-auto relative py-8">
        <div className="mb-6 text-center">
          <img
            src="https://i.imgur.com/xYi56xK.png"
            alt="Onyx Services Logo"
            className="h-12 w-auto mx-auto mb-3 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
          />
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="text-slate-400 hover:text-cyan-300 text-sm uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Homepage
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setRequest(null)}
              className="text-cyan-400 hover:text-cyan-300 text-sm uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search Another
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-slate-900/90 to-black/90 backdrop-blur-sm border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] p-6 clip-corners">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wider mb-1">Request Status</h2>
                <p className="text-cyan-600/60 text-xs uppercase tracking-widest">Code: {request.tracking_code}</p>
              </div>
              <div className={`px-4 py-2 clip-corners border-2 ${getStatusColor(request.status)} font-semibold text-xs uppercase tracking-widest`}>
                {formatStatus(request.status)}
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-t-2 border-cyan-500/20 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-1">Service</p>
                    <p className="text-cyan-100 font-medium">{request.service_types.name}</p>
                  </div>
                  <div>
                    <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-1">System</p>
                    <p className="text-cyan-100 font-medium">{request.star_citizen_systems.name} ({request.star_citizen_systems.code})</p>
                  </div>
                  <div>
                    <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-1">Location</p>
                    <p className="text-cyan-100 font-medium">{request.location_details}</p>
                  </div>
                  <div>
                    <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-1">Priority</p>
                    <p className="text-cyan-100 font-medium capitalize">{request.priority}</p>
                  </div>
                </div>
              </div>

              {request.service_types.name === 'Escort' && (
                <div className="border-t-2 border-cyan-500/20 pt-4">
                  <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-2">Escort Details</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-cyan-600/80">Origin:</span>
                      <span className="text-cyan-100 ml-2">{request.origin_location || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-cyan-600/80">Destination:</span>
                      <span className="text-cyan-100 ml-2">{request.destination_location || 'Not specified'}</span>
                    </div>
                    {request.escort_ship_requirements && (
                      <div>
                        <span className="text-cyan-600/80">Ship Requirements:</span>
                        <span className="text-cyan-100 ml-2">{request.escort_ship_requirements}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {request.description && (
                <div className="border-t-2 border-cyan-500/20 pt-4">
                  <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-1">Details</p>
                  <p className="text-cyan-100 text-sm">{request.description}</p>
                </div>
              )}

              <div className="border-t-2 border-cyan-500/20 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-1">Requested</p>
                    <p className="text-cyan-100 font-medium">{new Date(request.created_at).toLocaleString()}</p>
                  </div>
                  {request.users && (
                    <div>
                      <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-1">Assigned To</p>
                      <p className="text-cyan-100 font-medium">{request.users.discord_username}</p>
                    </div>
                  )}
                </div>
              </div>

              {request.service_types.name === 'Escort' && request.quoted_price_uec && (
                <div className="border-t-2 border-cyan-500/20 pt-4">
                  <p className="text-cyan-600/60 text-xs uppercase tracking-widest mb-3">Price Quote</p>
                  <div className="bg-green-900/20 border-2 border-green-500/30 clip-corners p-4">
                    <div className="text-center mb-4">
                      <p className="text-green-400 text-3xl font-bold mb-1">{request.quoted_price_uec.toLocaleString()} UEC</p>
                      <p className="text-slate-400 text-sm">
                        Quoted {request.price_quoted_at && new Date(request.price_quoted_at).toLocaleString()}
                      </p>
                    </div>

                    {request.price_status === 'quoted' && request.status !== 'completed' && request.status !== 'cancelled' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handlePriceResponse(true)}
                          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-3 px-4 clip-corners transition-all duration-200 uppercase tracking-widest text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handlePriceResponse(false)}
                          className="bg-gradient-to-r from-red-900/70 to-red-800/70 hover:from-red-800 hover:to-red-700 border-2 border-red-500/50 text-red-300 font-bold py-3 px-4 clip-corners transition-all duration-200 uppercase tracking-widest text-sm"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <div className={`text-center py-2 clip-corners border-2 font-bold uppercase text-sm ${
                        request.price_status === 'accepted'
                          ? 'bg-green-900/30 border-green-500/50 text-green-400'
                          : 'bg-red-900/30 border-red-500/50 text-red-400'
                      }`}>
                        Price {request.price_status}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {request.status !== 'completed' && request.status !== 'cancelled' && (
                <div className="border-t-2 border-cyan-500/20 pt-4">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full bg-gradient-to-r from-red-900/50 to-red-800/50 hover:from-red-800/70 hover:to-red-700/70 border-2 border-red-500/50 text-red-300 font-bold py-3 px-6 clip-corners transition-all duration-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Cancel Request
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/90 to-black/90 backdrop-blur-sm border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] clip-corners flex flex-col h-[600px]">
            <div className="p-4 border-b-2 border-cyan-500/30">
              <h3 className="text-lg font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Communication
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-cyan-600/40 mx-auto mb-3" />
                  <p className="text-cyan-600/60 text-sm uppercase tracking-widest">No messages yet</p>
                  <p className="text-cyan-600/40 text-xs mt-1">Start a conversation with dispatch</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.sender_type === 'client' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center ${
                      msg.sender_type === 'client'
                        ? 'bg-gradient-to-br from-blue-600 to-cyan-600'
                        : 'bg-gradient-to-br from-cyan-600 to-green-600'
                    }`}>
                      {msg.sender_type === 'client' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <UserCog className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className={`flex-1 ${msg.sender_type === 'client' ? 'text-right' : ''}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          msg.sender_type === 'client' ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          {msg.sender_name}
                        </span>
                        <span className="text-xs text-cyan-600/60">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className={`inline-block px-4 py-2 clip-corners text-sm ${
                        msg.sender_type === 'client'
                          ? 'bg-blue-900/30 border-2 border-blue-500/30 text-blue-100'
                          : 'bg-cyan-900/30 border-2 border-cyan-500/30 text-cyan-100'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t-2 border-cyan-500/30">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200 outline-none placeholder-cyan-700 text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-700 text-white font-bold clip-corners transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] flex items-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {showCancelModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-900/95 to-black/95 border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.4)] p-8 max-w-md w-full clip-corners">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-red-400 uppercase tracking-wider mb-2">Cancel Request</h3>
                  <p className="text-slate-400 text-sm">Please let us know why you're cancelling</p>
                </div>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setCancelDetails('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-cyan-600/60 text-xs uppercase tracking-widest mb-2">
                    Cancellation Reason *
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="">Select a reason...</option>
                    <option value="service_no_longer_needed">Service No Longer Needed</option>
                    <option value="took_too_long">Taking Too Long</option>
                    <option value="disconnected">Disconnected from Game</option>
                    <option value="found_alternative">Found Alternative Solution</option>
                    <option value="wrong_service">Requested Wrong Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-cyan-600/60 text-xs uppercase tracking-widest mb-2">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={cancelDetails}
                    onChange={(e) => setCancelDetails(e.target.value)}
                    placeholder="Any additional information..."
                    rows={3}
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                      setCancelDetails('');
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 clip-corners transition-all duration-200 uppercase tracking-widest text-sm"
                  >
                    Keep Request
                  </button>
                  <button
                    onClick={handleCancelRequest}
                    disabled={!cancelReason || cancelling}
                    className="flex-1 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 disabled:from-slate-800 disabled:to-slate-700 text-white font-bold py-3 px-6 clip-corners transition-all duration-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Confirm Cancel'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
