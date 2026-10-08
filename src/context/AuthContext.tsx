import type { Session, User } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/errors';

type FamilySummary = { id: string; name: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  family: FamilySummary | null;
  loading: boolean;
  familyLoading: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  createFamily: (familyName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [family, setFamily] = useState<FamilySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyLoading, setFamilyLoading] = useState(false);

  const loadFamily = useCallback(async (userId: string) => {
    setFamilyLoading(true);
    try {
      const { data: membership, error: membershipError } = await supabase
        .from('family_users')
        .select('family_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        setFamily(null);
        return;
      }

      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, name')
        .eq('id', membership.family_id)
        .single();

      if (familyError) throw familyError;
      setFamily(familyData);
    } finally {
      setFamilyLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (!nextSession) setFamily(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user.id) {
      loadFamily(session.user.id).catch((error) => {
        console.error('[Tavola] Impossibile caricare la famiglia:', getErrorMessage(error), error);
        setFamily(null);
      });
    }
  }, [loadFamily, session?.user.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (error) throw error;
    return !data.session;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const createFamily = async (familyName: string) => {
    if (!session?.user) throw new Error('Sessione non disponibile.');

    const { data: newFamily, error: familyError } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), created_by: session.user.id })
      .select('id, name')
      .single();
    if (familyError) {
      console.error('[Tavola] Creazione famiglia fallita:', familyError);
      throw familyError;
    }

    const name = String(session.user.user_metadata.display_name || session.user.email?.split('@')[0] || 'Io');
    const { error: memberError } = await supabase.from('family_members').insert({
      family_id: newFamily.id,
      linked_user_id: session.user.id,
      display_name: name,
    });
    if (memberError) {
      console.error('[Tavola] Creazione del primo componente fallita:', memberError);
      throw memberError;
    }
    setFamily(newFamily);
  };

  const displayName = String(session?.user.user_metadata.display_name || session?.user.email?.split('@')[0] || '');
  const value = useMemo(
    () => ({ session, user: session?.user ?? null, family, loading, familyLoading, displayName, signIn, signUp, signOut, createFamily }),
    [displayName, family, familyLoading, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return value;
}
