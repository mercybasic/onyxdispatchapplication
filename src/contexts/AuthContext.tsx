import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        validateAndLoadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (() => {
        setUser(session?.user ?? null);
        if (session?.user) {
          validateAndLoadProfile(session.user);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateAndLoadProfile = async (user: SupabaseUser) => {
    try {
      const isDiscordUser = user.app_metadata?.provider === 'discord';

      if (isDiscordUser) {
        setError(null);
        await verifyDiscordUser(user);
      } else {
        setError(null);
        await loadProfile(user.id, user.email || '');
      }
    } catch (err) {
      console.error('Error validating profile:', err);
      setLoading(false);
    }
  };

  const verifyDiscordUser = async (user: SupabaseUser) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      console.log('Verifying Discord user...');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-discord`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Verify response status:', response.status);
      const result = await response.json();
      console.log('Verify result:', result);

      if (!response.ok || !result.verified) {
        const errorMessage = result.reason || result.error || 'Discord verification failed. Please ensure you are a member of the Onyx Services Discord server with the appropriate role.';
        console.error('Verification failed:', errorMessage);
        setError(errorMessage);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('Discord verification successful, loading profile...');
      await loadProfile(user.id, user.email || '');
    } catch (err) {
      console.error('Discord verification error:', err);
      setError('Failed to verify Discord server membership. Please try again.');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string, email: string) => {
    try {
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data && email) {
        const username = email.split('@')[0];
        const discordId = user?.user_metadata?.provider_id || userId;
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            discord_id: discordId,
            discord_username: username,
            role: 'crew',
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        data = newUser;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithDiscord = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'identify guilds',
      },
    });
    if (error) {
      setError(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signInWithDiscord, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
