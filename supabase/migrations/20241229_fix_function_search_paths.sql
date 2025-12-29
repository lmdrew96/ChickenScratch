-- Migration: Fix Function Search Path Security Warnings
-- Date: 2024-12-29
--
-- This migration fixes the function_search_path_mutable warnings by adding
-- SET search_path = public to all affected functions.
--
-- Functions affected:
--   - handle_updated_at
--   - handle_new_user
--   - user_has_role
--   - is_officer
--   - is_committee
--   - user_has_position
--   - is_admin_position

-- ============================================================================
-- handle_updated_at - Trigger function for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- handle_new_user - Trigger function for new user creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- user_has_role - Check if user has a specific role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND required_role = ANY(user_roles.roles)
  );
$$;

-- ============================================================================
-- is_officer - Check if current user is an officer
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND 'officer' = ANY(user_roles.roles)
  );
$$;

-- ============================================================================
-- is_committee - Check if current user is a committee member
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_committee()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND 'committee' = ANY(user_roles.roles)
  );
$$;

-- ============================================================================
-- user_has_position - Check if user has a specific position
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_position(required_position text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND required_position = ANY(user_roles.positions)
  );
$$;

-- ============================================================================
-- is_admin_position - Check if current user has an admin position
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_position()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.positions && ARRAY[
      'BBEG',
      'Dictator-in-Chief',
      'Editor-in-Chief'
    ]::text[]
  );
$$;
