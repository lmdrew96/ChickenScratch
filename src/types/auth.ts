// Authentication types
export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string | null;
}

export type UserRole = 
  | 'student' 
  | 'editor' 
  | 'admin' 
  | 'bbeg' 
  | 'dictator_in_chief' 
  | 'scroll_gremlin' 
  | 'chief_hoarder' 
  | 'pr_nightmare' 
  | 'editor_in_chief' 
  | 'submissions_coordinator' 
  | 'proofreader' 
  | 'lead_design';

export type CommitteeRole = 
  | 'editor_in_chief' 
  | 'submissions_coordinator' 
  | 'proofreader' 
  | 'lead_design';

export type EditorialRole = 
  | 'editor' 
  | 'admin' 
  | 'editor_in_chief';

// Auth context types
export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

// Auth guard types
export interface AuthGuardConfig {
  requiredRoles?: UserRole[];
  allowedRoles?: UserRole[];
  redirectTo?: string;
  requireAuth?: boolean;
}