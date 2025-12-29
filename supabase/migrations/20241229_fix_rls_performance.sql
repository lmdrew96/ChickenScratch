-- Migration: Fix RLS Performance Warnings
-- Date: 2024-12-29
-- 
-- This migration fixes two types of Supabase linter warnings:
-- 1. auth_rls_initplan: Wrap auth.<function>() calls with (select auth.<function>())
-- 2. multiple_permissive_policies: Consolidate multiple permissive policies
--
-- Schema notes:
--   profiles: uses "id" as user identifier
--   submissions: uses "owner_id" as user identifier  
--   user_roles: uses "user_id", has "roles" array and "positions" array

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with optimized auth function calls
-- profiles.id = auth.uid() (id is the user's UUID)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- USER_ROLES TABLE
-- ============================================================================

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role only for modifications" ON public.user_roles;

-- Consolidate into single SELECT policy (fixes multiple_permissive_policies)
CREATE POLICY "Anyone can read roles"
ON public.user_roles
FOR SELECT
TO anon, authenticated
USING (true);

-- Separate policy for service role modifications (no auth function needed for service_role)
CREATE POLICY "Service role can modify roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SUBMISSIONS TABLE
-- ============================================================================

-- Drop all existing SELECT policies for submissions
DROP POLICY IF EXISTS "Anyone can view published submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Officers and committee can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Committee can view assigned submissions" ON public.submissions;

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Officers and committee can update submissions" ON public.submissions;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create own submissions" ON public.submissions;

-- ============================================================================
-- CONSOLIDATED SELECT POLICY FOR SUBMISSIONS
-- Combines all SELECT conditions into one policy per role
-- ============================================================================

-- For anonymous users: only view published
CREATE POLICY "Anon can view published submissions"
ON public.submissions
FOR SELECT
TO anon
USING (status = 'published');

-- For authenticated users: consolidated view policy
-- Can view if: published OR own submission OR is officer/committee member
-- Note: user_roles.roles is an array, use && (overlap) or @> (contains) operator
CREATE POLICY "Authenticated users view submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND (
      user_roles.roles && ARRAY['officer', 'committee']::text[]
      OR user_roles.positions && ARRAY[
        'Editor-in-Chief',
        'Submissions Coordinator', 
        'Proofreader',
        'Lead Design'
      ]::text[]
    )
  )
);

-- ============================================================================
-- CONSOLIDATED INSERT POLICY FOR SUBMISSIONS
-- ============================================================================

CREATE POLICY "Users can create own submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));

-- ============================================================================
-- CONSOLIDATED UPDATE POLICY FOR SUBMISSIONS
-- ============================================================================

-- Authenticated users can update if: own submission OR is officer/committee member
CREATE POLICY "Authenticated users update submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND (
      user_roles.roles && ARRAY['officer', 'committee']::text[]
      OR user_roles.positions && ARRAY[
        'Editor-in-Chief',
        'Submissions Coordinator',
        'Proofreader',
        'Lead Design'
      ]::text[]
    )
  )
)
WITH CHECK (
  owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND (
      user_roles.roles && ARRAY['officer', 'committee']::text[]
      OR user_roles.positions && ARRAY[
        'Editor-in-Chief',
        'Submissions Coordinator',
        'Proofreader',
        'Lead Design'
      ]::text[]
    )
  )
);

-- ============================================================================
-- HELPER FUNCTION (Optional but recommended for cleaner policies)
-- ============================================================================

-- Create a security definer function to check user roles/positions efficiently
CREATE OR REPLACE FUNCTION public.has_role_or_position(
  required_roles text[] DEFAULT ARRAY[]::text[],
  required_positions text[] DEFAULT ARRAY[]::text[]
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND (
      (array_length(required_roles, 1) > 0 AND user_roles.roles && required_roles)
      OR (array_length(required_positions, 1) > 0 AND user_roles.positions && required_positions)
    )
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_role_or_position(text[], text[]) TO authenticated;
