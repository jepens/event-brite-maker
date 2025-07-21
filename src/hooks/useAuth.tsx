import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FETCH_TIMEOUT = 15000; // 15 seconds timeout

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const initializationTimer = useRef<NodeJS.Timeout>();
  const mounted = useRef(false);
  const profileFetchAttempts = useRef(0);

  const fetchProfile = useCallback(async (userId: string, isRetry = false) => {
    try {
      if (profileFetchAttempts.current >= 3 && !isRetry) {
        throw new Error('Failed to fetch profile after multiple attempts');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([
                {
                  user_id: userId,
                  full_name: userData.user.user_metadata?.full_name || userData.user.email,
                  email: userData.user.email,
                  role: 'user'
                }
              ])
              .select()
              .single();

            if (createError) throw createError;
            return newProfile;
          }
        }
        throw new Error(`Error fetching profile: ${profileError.message}`);
      }

      return profileData;
    } catch (error) {
      profileFetchAttempts.current += 1;
      if (profileFetchAttempts.current < 3) {
        // Retry after 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchProfile(userId, true);
      }
      throw error;
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      profileFetchAttempts.current = 0;

      // Clear any existing initialization timer
      if (initializationTimer.current) {
        clearTimeout(initializationTimer.current);
      }

      // Set new initialization timeout
      initializationTimer.current = setTimeout(() => {
        if (mounted.current && loading) {
          setError(new Error('Authentication initialization timeout'));
          setLoading(false);
        }
      }, FETCH_TIMEOUT);

      // First check localStorage for existing session
      const existingSession = supabase.auth.getSession();
      if (existingSession) {
        const { data: { session } } = await existingSession;
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          try {
            const profileData = await fetchProfile(session.user.id);
            if (mounted.current) {
              setProfile(profileData);
              // Show welcome back toast
              toast({
                title: "Welcome back!",
                description: `Logged in as ${profileData.full_name || session.user.email}`,
              });
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
            if (mounted.current) {
              setError(error instanceof Error ? error : new Error('Failed to fetch profile'));
            }
          }
        }
      }

      // Set up realtime subscription for profile updates
      const profileSubscription = supabase
        .channel('profile-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${session?.user?.id}`,
        }, (payload) => {
          if (mounted.current) {
            setProfile(payload.new);
          }
        })
        .subscribe();

      return () => {
        profileSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Auth initialization error:', error);
      if (mounted.current) {
        setError(error instanceof Error ? error : new Error('Authentication failed'));
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        if (initializationTimer.current) {
          clearTimeout(initializationTimer.current);
        }
      }
    }
  }, [fetchProfile]);

  const retry = useCallback(() => {
    profileFetchAttempts.current = 0;
    setRetryCount(count => count + 1);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let authSubscription: any;
    let cleanup: (() => void) | undefined;

    const setupAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted.current) return;

            console.log('Auth state changed:', event, session);
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              try {
                const profileData = await fetchProfile(session.user.id);
                if (mounted.current) {
                  setProfile(profileData);
                }
              } catch (error) {
                if (mounted.current) {
                  console.error('Error in profile fetch:', error);
                  setError(error instanceof Error ? error : new Error('Profile fetch failed'));
                  setProfile(null);
                }
              }
            } else {
              setProfile(null);
            }
            
            if (mounted.current) {
              setLoading(false);
            }
          }
        );

        authSubscription = subscription;
        cleanup = await initializeAuth();
      } catch (error) {
        if (mounted.current) {
          console.error('Auth setup error:', error);
          setError(error instanceof Error ? error : new Error('Auth setup failed'));
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      mounted.current = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (cleanup) {
        cleanup();
      }
      if (initializationTimer.current) {
        clearTimeout(initializationTimer.current);
      }
    };
  }, [initializeAuth, fetchProfile, retryCount]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      profileFetchAttempts.current = 0;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Pre-fetch profile after successful sign in
      if (data.user) {
        try {
          const profileData = await fetchProfile(data.user.id);
          setProfile(profileData);
          toast({
            title: "Welcome!",
            description: `Logged in as ${profileData.full_name || data.user.email}`,
          });
        } catch (profileError) {
          console.error('Error fetching profile after sign in:', profileError);
        }
      }

      return { error: null };
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Sign in failed'));
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setError(null);
      profileFetchAttempts.current = 0;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Sign up failed'));
      return { error };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setSession(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Sign out failed'));
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        profile, 
        signIn, 
        signUp, 
        signOut, 
        loading,
        error,
        retry
      }}
    >
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