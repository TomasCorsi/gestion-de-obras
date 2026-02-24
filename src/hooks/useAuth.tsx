import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type AppRole = 'admin' | 'capataz' | 'maquinista' | 'ayudante';

interface Profile {
  id: string;
  user_id: string;
  nombre_completo: string;
  telefono: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, nombreCompleto: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  // Helper: race a promise against a timeout (resolves with null on timeout)
  const raceWithTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
    Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);

  const fetchUserData = async (userId: string) => {
    setRoleLoading(true);
    try {
      // Fetch profile and role in parallel
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (profileResult.error) throw profileResult.error;
      setProfile(profileResult.data);
      if (profileResult.data) {
        try { localStorage.setItem(`offline_cache_profile_${userId}`, JSON.stringify(profileResult.data)); } catch {}
      }

      if (roleResult.error) throw roleResult.error;
      const fetchedRole = roleResult.data?.role as AppRole || null;
      setRole(fetchedRole);
      if (fetchedRole) {
        try { localStorage.setItem(`offline_cache_role_${userId}`, fetchedRole); } catch {}
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Offline fallback: serve cached data (may already be hydrated below)
      try {
        const cachedProfile = localStorage.getItem(`offline_cache_profile_${userId}`);
        if (cachedProfile) setProfile(JSON.parse(cachedProfile));
        const cachedRole = localStorage.getItem(`offline_cache_role_${userId}`);
        if (cachedRole) setRole(cachedRole as AppRole);
      } catch {}
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // 1. Hydrate profile/role from cache IMMEDIATELY so ProtectedRoute unblocks fast
        const cachedUserId = (() => {
          try {
            const raw = localStorage.getItem(`sb-euytcvwhrhvtwvppvawd-auth-token`);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.user?.id ?? null;
          } catch { return null; }
        })();

        if (cachedUserId && isMounted) {
          try {
            const cp = localStorage.getItem(`offline_cache_profile_${cachedUserId}`);
            if (cp) setProfile(JSON.parse(cp));
            const cr = localStorage.getItem(`offline_cache_role_${cachedUserId}`);
            if (cr) setRole(cr as AppRole);
          } catch {}
        }

        // 2. Race getSession() with a 3s timeout
        const sessionResult = await raceWithTimeout(
          supabase.auth.getSession(),
          3000
        );
        
        if (!isMounted) return;
        
        const resolvedSession = sessionResult?.data?.session ?? null;
        
        if (resolvedSession?.user) {
          setSession(resolvedSession);
          setUser(resolvedSession.user);
          // 3. Race fetchUserData with a 3s timeout (cache already hydrated above)
          await raceWithTimeout(fetchUserData(resolvedSession.user.id), 3000);
        } else if (sessionResult === null && cachedUserId) {
          // getSession timed out but we have cached auth — try to build user from cache
          // The Supabase SDK persists the session in localStorage; read it directly
          try {
            const raw = localStorage.getItem(`sb-euytcvwhrhvtwvppvawd-auth-token`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.user) {
                setUser(parsed.user);
                setSession(parsed);
              }
            }
          } catch {}
          // profile/role already hydrated from step 1
        } else {
          // No session at all
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Evitar “flicker”/recargas visuales: en refresh de token solo actualizamos el session.
        // Mantener el mismo objeto `user` evita que hooks dependientes (ej: useEmpleadoProfile)
        // se re-ejecuten al volver a enfocar la pestaña.
        if ((event as unknown as string) === 'TOKEN_REFRESHED') {
          setSession(session);
          return;
        }
        
        // En refresh de token solo actualizamos la sesión sin disparar re-renders innecesarios
        if (event === 'TOKEN_REFRESHED') {
          console.debug('[Auth] Token refreshed silently');
          setSession(session);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid blocking the callback
          setTimeout(() => {
            if (isMounted) {
              fetchUserData(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, nombreCompleto: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nombre_completo: nombreCompleto,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Cuenta creada exitosamente');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Sesión iniciada');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setProfile(null);
    setRole(null);
    toast.success('Sesión cerrada');
  };

  const hasRole = (requiredRole: AppRole | AppRole[]): boolean => {
    if (!role) return false;
    
    // Admin has access to everything
    if (role === 'admin') return true;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    return role === requiredRole;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signUp,
        signIn,
        signOut,
        hasRole,
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
