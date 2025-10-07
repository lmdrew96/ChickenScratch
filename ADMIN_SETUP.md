# Admin Access Setup Guide

This guide explains how to fix the admin page access and set up proper role-based access control.

## The Problem

The admin page was redirecting because of an **infinite recursion error** in the Supabase Row Level Security (RLS) policy. The policy tried to check if a user was an admin by querying the `user_roles` table, but that query itself required checking the policy, creating an infinite loop.

## The Solution

We've implemented a production-ready solution that:
1. Removes the infinite recursion by simplifying RLS policies
2. Uses Supabase's service role for admin operations
3. Keeps authorization checks in the application layer

## Setup Steps

### 1. Add Service Role Key to Environment

Make sure your `.env.local` file has the service role key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**To find your service role key:**
1. Go to your Supabase dashboard
2. Navigate to Settings → API
3. Copy the `service_role` key (NOT the anon key)
4. Add it to your `.env.local` file

⚠️ **IMPORTANT**: Never commit the service role key to version control. It has full database access.

### 2. Apply the Database Migration

Run the migration to fix the RLS policies:

**Option A: Using Supabase CLI (Recommended)**
```bash
cd your-repo
supabase db push
```

**Option B: Manual SQL Execution**
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/fix_user_roles_rls_production.sql`
4. Paste and run the SQL

### 3. Verify Your User Has Admin Role

After applying the migration, visit `/test-role` to check your role data. You should see:

```json
{
  "is_member": true,
  "role": "officer",
  "position": "Dictator-in-Chief"
}
```

If your position is `null` or different, you need to update it in the database.

### 4. Set Your User as Admin (If Needed)

If you need to manually set yourself as admin:

**Option A: Using Supabase Dashboard**
1. Go to Table Editor → `user_roles`
2. Find your user (by user_id or email)
3. Edit the row and set:
   - `is_member`: true
   - `role`: "officer"
   - `position`: "Dictator-in-Chief" or "BBEG"

**Option B: Using SQL**
```sql
-- Replace 'your-user-id' with your actual user ID from /test-role
INSERT INTO user_roles (user_id, is_member, role, position)
VALUES ('your-user-id', true, 'officer', 'Dictator-in-Chief')
ON CONFLICT (user_id) 
DO UPDATE SET 
  is_member = true,
  role = 'officer',
  position = 'Dictator-in-Chief';
```

### 5. Test Admin Access

1. Visit `/test-role` - you should see your role data without errors
2. Visit `/admin` - you should now have access

## How It Works

### RLS Policies

The new RLS setup is simple and secure:

```sql
-- Anyone can READ roles (needed for permission checks)
CREATE POLICY "Anyone can read roles" ON user_roles
  FOR SELECT USING (true);

-- Only service role can MODIFY roles
CREATE POLICY "Service role only for modifications" ON user_roles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

### Authorization Flow

1. **User requests admin page** → Server checks if user is logged in
2. **Server queries user_roles** → Uses regular client (anon key) to read role
3. **Server checks if admin** → Compares position to 'BBEG' or 'Dictator-in-Chief'
4. **If admin needs to modify roles** → Uses service role client to bypass RLS

### Security Benefits

- ✅ No infinite recursion
- ✅ All role modifications require service role (server-side only)
- ✅ Authorization checks happen in application code
- ✅ Service role key never exposed to browser
- ✅ Clear separation between read and write operations

## Troubleshooting

### "Missing SUPABASE_SERVICE_ROLE_KEY" Error

Make sure you've added the service role key to `.env.local` and restarted your dev server.

### Still Getting Redirected from /admin

1. Check `/test-role` to see your actual role data
2. Verify your position is exactly "Dictator-in-Chief" or "BBEG" (case-sensitive)
3. Check the server console for debug logs
4. Make sure you applied the migration

### "Unauthorized" When Updating Roles

This means the current user is not an admin. Check their role in the database.

## Admin Positions

These positions have admin access:
- **BBEG** - Big Bad Evil Guy
- **Dictator-in-Chief** - Top administrator

All other positions are non-admin roles.
