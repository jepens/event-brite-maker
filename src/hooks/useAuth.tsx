import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase, testSupabaseConnection } from '../integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Record<string, unknown> | null;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_RETRY_ATTEMPTS = 3;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Debug: Track profile state changes
  useEffect(() => {
    console.log('Profile state updated:', {
      profile,
      role: profile?.role,
      userId: profile?.user_id,
      fullName: profile?.full_name,
      timestamp: new Date().toISOString()
    });
  }, [profile]);

  // Custom setProfile function to update both state and ref
  const setProfileWithRef = useCallback((newProfile: Record<string, unknown> | null) => {
    currentProfile.current = newProfile;
    setProfile(newProfile);
  }, []);

  const mounted = useRef(true);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const initializationTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const profileFetchAttempts = useRef(0);
  const profileFetchPromise = useRef<Promise<Record<string, unknown> | null> | null>(null);
  const isProfileFetching = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const currentProfile = useRef<Record<string, unknown> | null>(null);
  const DEBOUNCE_DELAY = 1000; // 1 second debounce

  const fetchProfile = useCallback(async (userId: string, isRetry = false, isRefresh = false): Promise<Record<string, unknown> | null> => {
    const now = Date.now();
    
    console.log(`fetchProfile called with userId: ${userId}, isRetry: ${isRetry}, isRefresh: ${isRefresh}`);
    
    // Prevent duplicate fetches for the same user
    if (isProfileFetching.current && lastFetchedUserId.current === userId && !isRetry) {
      console.log('Profile fetch already in progress, returning existing promise');
      return profileFetchPromise.current;
    }

    // Debounce rapid successive calls
    if (!isRetry && (now - lastFetchTime.current) < DEBOUNCE_DELAY) {
      console.log('Profile fetch debounced, too soon since last fetch');
      return profileFetchPromise.current;
    }

    // If we already have a valid profile for this user, return it
    if (currentProfile.current && currentProfile.current.user_id === userId && currentProfile.current.role && currentProfile.current.role !== 'user') {
      console.log('Using existing valid profile from memory');
      return currentProfile.current;
    }

    isProfileFetching.current = true;
    lastFetchedUserId.current = userId;
    lastFetchTime.current = now;
    profileFetchAttempts.current = isRetry ? profileFetchAttempts.current + 1 : 1;

    if (isRetry || profileFetchAttempts.current > 1) {
      console.log(`Fetching profile for user: ${userId} Attempt: ${profileFetchAttempts.current}`);
    } else {
      console.log(`Starting profile fetch for user: ${userId}`);
    }

    try {
      console.log('Making Supabase query for profile...');
      
      // Test connection first
      console.log('Testing Supabase connection before query...');
      try {
        const connectionTestPromise = supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        const connectionTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log('Connection test timeout reached after 3 seconds');
            reject(new Error('Connection test timeout after 3 seconds'));
          }, 3000);
        });
        
        const { data: testData, error: testError } = await Promise.race([connectionTestPromise, connectionTimeoutPromise]) as { data: unknown; error: unknown };
        
        if (testError) {
          console.error('Supabase connection test failed:', testError);
          console.log('Connection test failed, but continuing with profile fetch');
          // Don't return default profile here, let the actual query handle it
        }
        console.log('Supabase connection test successful');
      } catch (connectionError) {
        console.error('Supabase connection test error:', connectionError);
        console.log('Connection test error, setting default profile immediately');
        return {
          user_id: userId,
          full_name: 'Unknown User',
          email: 'unknown@example.com',
          role: 'user'
        };
      }
      
      // Add timeout wrapper to prevent hanging
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('Query promise created, setting up timeout...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('Query timeout reached after 15 seconds');
          reject(new Error('Profile fetch timeout after 15 seconds'));
        }, 15000);
      });

      console.log('Starting Promise.race between query and timeout...');
      try {
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as { data: unknown; error: unknown };
        console.log('Supabase query completed:', { data, error });

        if (error) {
          console.error('Profile fetch error:', error);
          
          // If it's a timeout error, set a default profile
          if (error instanceof Error && error.message.includes('timeout')) {
            console.log('Query timeout detected, setting default profile');
            return {
              user_id: userId,
              full_name: 'Unknown User',
              email: 'unknown@example.com',
              role: 'user'
            } as Record<string, unknown>;
          }
          
          throw error;
        }

        if (!data) {
          console.error('No profile data found');
          throw new Error('No profile data found');
        }

        console.log('Profile fetched successfully:', data);
        profileFetchAttempts.current = 0; // Reset attempts on success
        
        // Don't set profile here, let the caller handle it
        return data as Record<string, unknown>;
      } catch (raceError) {
        console.error('Promise.race error:', raceError);
        if (raceError instanceof Error && raceError.message.includes('timeout')) {
          console.log('Query timeout detected, setting default profile');
          return {
            user_id: userId,
            full_name: 'Unknown User',
            email: 'unknown@example.com',
            role: 'user'
          };
        }
        throw raceError;
      }
    } catch (error) {
      console.error(`Profile fetch failed (attempt ${profileFetchAttempts.current}):`, error);
      throw error;
    } finally {
      console.log('Profile fetch completed, setting isProfileFetching to false');
      isProfileFetching.current = false;
    }
  }, []); // No dependencies needed since we use refs

  const initializeAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        
        // Check if we have a valid profile in memory first
        if (currentProfile.current && 
            currentProfile.current.user_id === session.user.id && 
            currentProfile.current.role && 
            currentProfile.current.role !== 'user') {
          console.log('Using existing profile from memory during initialization');
          setProfileWithRef(currentProfile.current);
          setLoading(false);
          return;
        }
        
        try {
          // Use refresh mode for initialization (page refresh scenario)
          const profileData = await fetchProfile(session.user.id, false, true);
          if (mounted.current) {
            setProfileWithRef(profileData);
            setLoading(false);
          }
        } catch (error) {
          console.error('Profile fetch failed during initialization:', error);
          if (mounted.current) {
            // Only set default profile if we don't have a valid one
            if (!currentProfile.current || currentProfile.current.user_id !== session.user.id || currentProfile.current.role === 'user') {
              setProfileWithRef({
                user_id: session.user.id,
                full_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown User',
                email: session.user.email || 'unknown@example.com',
                role: 'user'
              });
            }
            setLoading(false);
          }
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      if (mounted.current) {
        setError(error instanceof Error ? error : new Error('Auth initialization failed'));
        setLoading(false);
      }
    }
  }, [fetchProfile, setProfileWithRef]); // Include setProfileWithRef dependency

  const retry = useCallback(() => {
    // Reset all fetch-related state
    profileFetchAttempts.current = 0;
    isProfileFetching.current = false;
    lastFetchedUserId.current = null;
    profileFetchPromise.current = null;
    
    setRetryCount(count => count + 1);
    setError(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    let cleanup: (() => void) | undefined;

    const setupAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted.current) return;

            // Only log non-initial auth state changes to reduce console noise
            if (event !== 'INITIAL_SESSION') {
              console.log('Auth state changed:', event, session);
            }
            
            // Clear timeout timer when auth state changes
            if (initializationTimer.current) {
              clearTimeout(initializationTimer.current);
              initializationTimer.current = undefined;
            }
            
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              // Always fetch profile for new sessions or when user changes
              const shouldFetchProfile = !currentProfile.current || 
                                       currentProfile.current.user_id !== session.user.id || 
                                       currentProfile.current.role === 'user' ||
                                       event === 'SIGNED_IN';
              
              console.log('Auth state change - shouldFetchProfile:', shouldFetchProfile, {
                hasCurrentProfile: !!currentProfile.current,
                currentUserId: currentProfile.current?.user_id,
                sessionUserId: session.user.id,
                currentRole: currentProfile.current?.role,
                event
              });
              
              if (shouldFetchProfile) {
                try {
                  if (event !== 'INITIAL_SESSION') {
                    console.log('Fetching profile for session user:', session.user.id);
                  } else {
                    console.log('INITIAL_SESSION - Fetching profile for session user:', session.user.id);
                  }
                  // Set loading to true when starting profile fetch
                  setLoading(true);
                  // Use refresh mode for INITIAL_SESSION (page refresh)
                  const isRefresh = event === 'INITIAL_SESSION';
                  console.log('About to call fetchProfile with isRefresh:', isRefresh);
                  const profileData = await fetchProfile(session.user.id, false, isRefresh);
                  console.log('fetchProfile completed successfully:', profileData);
                  if (mounted.current) {
                    if (event !== 'INITIAL_SESSION') {
                      console.log('Setting profile from auth state change:', profileData);
                    } else {
                      console.log('INITIAL_SESSION - Setting profile from auth state change:', profileData);
                    }
                    // Set profile state immediately after successful fetch
                    setProfileWithRef(profileData);
                    setError(null);
                    setLoading(false);
                    console.log('Profile set successfully, loading set to false');
                  }
                } catch (error) {
                  console.error('Error in profile fetch:', error);
                  if (mounted.current) {
                    // For refresh scenarios, don't retry immediately to avoid multiple timeouts
                    if (event === 'INITIAL_SESSION') {
                      console.log('Refresh scenario - setting default profile without retry');
                      setProfileWithRef({
                        user_id: session.user.id,
                        full_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown User',
                        email: session.user.email || 'unknown@example.com',
                        role: 'user'
                      });
                      setLoading(false);
                      console.log('Default profile set, loading set to false (refresh scenario)');
                    } else {
                      // Only retry if we haven't exceeded max attempts
                      if (profileFetchAttempts.current < MAX_RETRY_ATTEMPTS) {
                        console.log(`Retrying profile fetch (${profileFetchAttempts.current}/${MAX_RETRY_ATTEMPTS})...`);
                        setTimeout(async () => {
                          try {
                            const retryProfileData = await fetchProfile(session.user.id, true, false);
                            if (mounted.current) {
                              console.log('Retry successful, setting profile:', retryProfileData);
                              setProfileWithRef(retryProfileData);
                              setLoading(false);
                              console.log('Retry successful, loading set to false');
                            }
                          } catch (retryError) {
                            console.error('Retry failed, setting default profile');
                            if (mounted.current) {
                              setProfileWithRef({
                                user_id: session.user.id,
                                full_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown User',
                                email: session.user.email || 'unknown@example.com',
                                role: 'user'
                              });
                              setLoading(false);
                              console.log('Retry failed, default profile set, loading set to false');
                            }
                          }
                        }, Math.min(2000 * Math.pow(2, profileFetchAttempts.current - 1), 10000)); // Exponential backoff with max 10s
                      } else {
                        console.log('Max retry attempts reached, setting default profile');
                        setProfileWithRef({
                          user_id: session.user.id,
                          full_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown User',
                          email: session.user.email || 'unknown@example.com',
                          role: 'user'
                        });
                        setLoading(false);
                        console.log('Max retry attempts reached, default profile set, loading set to false');
                      }
                    }
                  }
                }
              } else {
                if (event !== 'INITIAL_SESSION') {
                  console.log('Using existing valid profile, no need to fetch');
                } else {
                  console.log('INITIAL_SESSION - Using existing valid profile, no need to fetch');
                }
                setLoading(false);
                console.log('Using existing profile, loading set to false');
              }
            } else {
              if (event !== 'INITIAL_SESSION') {
                console.log('No session user, clearing profile');
              } else {
                console.log('INITIAL_SESSION - No session user, clearing profile');
              }
              setProfileWithRef(null);
              setLoading(false);
              console.log('No session user, profile cleared, loading set to false');
            }
          }
        );

        authSubscription.current = subscription;
        await initializeAuth();
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
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
      }
      if (cleanup) {
        cleanup();
      }
      if (initializationTimer.current) {
        clearTimeout(initializationTimer.current);
      }
    };
  }, [initializeAuth, fetchProfile, retryCount, setProfileWithRef]); // Include setProfileWithRef dependency

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      profileFetchAttempts.current = 0;
      setLoading(true);
      
      // Test connection before attempting sign in
      try {
        const connectionTest = await testSupabaseConnection();
        if (!connectionTest.success) {
          throw new Error(`Connection failed: ${connectionTest.error}`);
        }
        console.log('Connection test successful');
      } catch (connectionError) {
        console.error('Connection test failed:', connectionError);
        throw new Error('Unable to connect to authentication service. Please check your internet connection.');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        if (error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        throw error;
      }

      // Pre-fetch profile after successful sign in
      if (data.user) {
        try {
          const profileData = await fetchProfile(data.user.id);
          if (profileData) {
            setProfileWithRef(profileData);
            toast({
              title: "Welcome!",
              description: `Logged in as ${profileData.full_name || data.user.email}`,
            });
          } else {
            // Handle case where profileData is null
            toast({
              title: "Welcome!",
              description: `Logged in as ${data.user.email}`,
            });
          }
        } catch (profileError) {
          console.error('Error fetching profile after sign in:', profileError);
          // Show toast with user email as fallback
          toast({
            title: "Welcome!",
            description: `Logged in as ${data.user.email}`,
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in failed:', error);
      setError(error instanceof Error ? error : new Error('Sign in failed'));
      setLoading(false);
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
      
      // Reset profile fetch attempts
      profileFetchAttempts.current = 0;
      
      await supabase.auth.signOut();
      setProfileWithRef(null);
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