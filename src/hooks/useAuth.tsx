import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const DEMO_JUDGE_USER: User = {
  id: '00000000-0000-4000-a000-000000000001',
  app_metadata: { provider: 'demo', providers: ['demo'] },
  user_metadata: {
    display_name: 'Dr. Judge (Evaluator)',
    institution: 'Cosmic Review Board',
    role: 'judge',
  },
  aud: 'authenticated',
  created_at: '2025-01-01T00:00:00.000Z',
  email: 'judge@cosmicfusion.space',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoUser: boolean;
  signUp: (email: string, password: string, displayName?: string, institution?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInAsDemo: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('cosmic_demo_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemoUser = !!(user && (user.id === DEMO_JUDGE_USER.id || user.email === 'judge@cosmicfusion.space'));

  useEffect(() => {
    // Check if demo user already exists in storage
    const storedDemo = localStorage.getItem('cosmic_demo_user');
    if (storedDemo) {
      try {
        const parsed = JSON.parse(storedDemo);
        setUser(parsed);
      } catch (e) {
        console.error('Error reading demo session:', e);
      }
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (!localStorage.getItem('cosmic_demo_user')) {
            setSession(null);
            setUser(null);
          }
        } else if (session) {
          localStorage.removeItem('cosmic_demo_user');
          setSession(session);
          setUser(session.user ?? null);
        }
        setLoading(false);

        // Defer profile updates to avoid deadlock
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            updateProfile(session.user);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateProfile = async (user: User) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingProfile && user.email) {
        // Profile will be created by the trigger, but we can update display_name
        const { error } = await supabase
          .from('profiles')
          .update({ 
            display_name: user.user_metadata?.display_name,
            institution: user.user_metadata?.institution 
          })
          .eq('user_id', user.id);
        
        if (error) console.error('Error updating profile:', error);
      }
    } catch (error) {
      console.error('Error in updateProfile:', error);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string, institution?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName,
            institution: institution,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(error.message);
        }
        return { error };
      }

      toast.success('Account created successfully!');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else {
          toast.error(error.message);
        }
        return { error };
      }

      toast.success('Welcome back!');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
      return { error: err };
    }
  };

  const signInAsDemo = async () => {
    try {
      // First try Supabase credentials if account exists
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'judge@cosmicfusion.space',
        password: 'CosmicJudge2025!',
      });

      if (!error && data?.user) {
        setUser(data.user);
        setSession(data.session);
        localStorage.setItem('cosmic_demo_user', JSON.stringify(data.user));
        toast.success('Welcome, Judge! Logged into Cosmic Fusion.');
        return { error: null };
      }

      // Fallback: Instant judge evaluator session
      setUser(DEMO_JUDGE_USER);
      localStorage.setItem('cosmic_demo_user', JSON.stringify(DEMO_JUDGE_USER));
      toast.success('Welcome, Judge! Logged in with instant evaluation access.');
      return { error: null };
    } catch {
      setUser(DEMO_JUDGE_USER);
      localStorage.setItem('cosmic_demo_user', JSON.stringify(DEMO_JUDGE_USER));
      toast.success('Welcome, Judge! Logged in with instant evaluation access.');
      return { error: null };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('cosmic_demo_user');
    setUser(null);
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore Supabase signout error if session was mock
    }
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemoUser, signUp, signIn, signInAsDemo, signOut }}>
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
