import { useState, useEffect } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { testSupabaseConnection } from '@/integrations/supabase/client';

export function useAuthPage() {
  const { signIn, signUp, user, loading } = useAuthHook();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const result = await testSupabaseConnection();
      if (result.success) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus('offline');
      }
    } catch (error) {
      setConnectionStatus('offline');
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSignIn = async (formData: FormData) => {
    setIsSubmitting(true);

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await signIn(email, password);

      if (error) {
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Provide more user-friendly error messages
        if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
          errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        } else if (errorMessage.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (formData: FormData) => {
    setIsSubmitting(true);

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = email.split('@')[0]; // Use email prefix as full name

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, fullName);

      if (error) {
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
          errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (errorMessage.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Account created successfully! Please check your email to confirm your account.',
        });
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    user,
    loading,
    isSubmitting,
    connectionStatus,
    checkConnection,
    handleSignIn,
    handleSignUp,
  };
} 