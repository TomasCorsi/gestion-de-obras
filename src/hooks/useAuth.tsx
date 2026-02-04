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

      if (roleResult.error) throw roleResult.error;
      setRole(roleResult.data?.role as AppRole || null);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Get initial session first
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
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
        
        // Log silencioso para debugging
        if (event === 'TOKEN_REFRESHED') {
          console.debug('[Auth] Token refreshed silently');
        }
        
        // Si se cierra sesión inesperadamente, intentar recuperar
        if (event === 'SIGNED_OUT' && session === null) {
          console.debug('[Auth] Unexpected sign out, attempting recovery...');
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session && isMounted) {
              console.debug('[Auth] Session recovered successfully');
              setSession(data.session);
              setUser(data.session.user);
              fetchUserData(data.session.user.id);
              return;
            }
          } catch (e) {
            console.warn('[Auth] Session recovery failed:', e);
          }
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
