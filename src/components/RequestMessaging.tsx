import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader2, User, UserCog, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  request_id: string;
  sender_type: 'client' | 'dispatcher';
  sender_name: string;
  message: string;
  created_at: string;
}

interface RequestMessagingProps {
  requestId: string;
  clientName: string;
}

export function RequestMessaging({ requestId, clientName }: RequestMessagingProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
    scrollToBottom();

    const channel = supabase
      .channel(`request-messaging:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          console.log('New message in dispatcher messaging:', payload);
          setMessages(prev => [...prev, payload.new as Message]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        console.log('Dispatcher messaging subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('request_messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    setSending(true);

    try {
      const { error } = await supabase
        .from('request_messages')
        .insert([{
          request_id: requestId,
          sender_type: 'dispatcher',
          sender_name: profile.discord_username,
          message: newMessage.trim(),
        }]);

      if (error) throw error;

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
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

  return (
    <div className="border-t-2 border-cyan-500/30 bg-black/30 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        <h4 className="text-lg font-bold text-cyan-400 uppercase tracking-wide">Client Communication</h4>
      </div>

      <div className="mb-4 max-h-96 overflow-y-auto space-y-3 bg-black/50 border border-cyan-500/20 clip-corners p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-cyan-600/40 mx-auto mb-2" />
            <p className="text-cyan-600/60 text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender_type === 'dispatcher' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center ${
                msg.sender_type === 'dispatcher'
                  ? 'bg-gradient-to-br from-cyan-600 to-green-600'
                  : 'bg-gradient-to-br from-blue-600 to-cyan-600'
              }`}>
                {msg.sender_type === 'dispatcher' ? (
                  <UserCog className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`flex-1 ${msg.sender_type === 'dispatcher' ? 'text-right' : ''}`}>
                <div className={`flex items-baseline gap-2 mb-1 ${msg.sender_type === 'dispatcher' ? 'justify-end' : ''}`}>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    msg.sender_type === 'dispatcher' ? 'text-green-400' : 'text-blue-400'
                  }`}>
                    {msg.sender_name}
                  </span>
                  <span className="text-xs text-cyan-600/60">{formatTime(msg.created_at)}</span>
                </div>
                <div className={`inline-block px-4 py-2 clip-corners text-sm ${
                  msg.sender_type === 'dispatcher'
                    ? 'bg-cyan-900/30 border-2 border-cyan-500/30 text-cyan-100'
                    : 'bg-blue-900/30 border-2 border-blue-500/30 text-blue-100'
                }`}>
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${clientName}...`}
          className="flex-1 px-4 py-2 bg-black/50 border-2 border-cyan-500/30 clip-corners text-cyan-100 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] placeholder-cyan-700"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-700 text-white font-bold clip-corners transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] flex items-center gap-2"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
