import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const PENDING_INVITE_KEY = 'deathafter:pending_invite_token';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  /** 가입 직후 true — 온보딩 화면으로 분기하는 데 사용 */
  isNewUser: boolean;
  /** 초대 링크 수신 후, 로그인/가입 완료 전 임시 보관 */
  pendingInviteToken: string | null;
  setPendingInviteToken: (token: string | null) => void;
  clearNewUser: () => void;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [pendingInviteToken, setPendingInviteTokenState] = useState<string | null>(null);

  useEffect(() => {
    // 앱 시작 시 저장된 초대 토큰 복원
    AsyncStorage.getItem(PENDING_INVITE_KEY).then((token) => {
      if (token) setPendingInviteTokenState(token);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setPendingInviteToken = useCallback(async (token: string | null) => {
    setPendingInviteTokenState(token);
    if (token) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
    } else {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    }
  }, []);

  const clearNewUser = useCallback(() => setIsNewUser(false), []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    setIsNewUser(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await setPendingInviteToken(null);
    setIsNewUser(false);
  }, [setPendingInviteToken]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isNewUser,
        pendingInviteToken,
        setPendingInviteToken,
        clearNewUser,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
