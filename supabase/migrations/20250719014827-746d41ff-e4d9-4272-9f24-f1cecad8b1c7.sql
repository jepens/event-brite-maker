-- Fix infinite recursion in profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = $1 AND profiles.role = 'admin'
  );
$$;

-- Recreate policies without recursion
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Fix events policies to use the security definer function
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Admins can manage events" 
ON public.events 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Fix registrations policies
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;

CREATE POLICY "Admins can view all registrations" 
ON public.registrations 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update registrations" 
ON public.registrations 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Fix tickets policies
DROP POLICY IF EXISTS "Admins can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;

CREATE POLICY "Admins can manage tickets" 
ON public.tickets 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all tickets" 
ON public.tickets 
FOR SELECT 
USING (public.is_admin(auth.uid()));