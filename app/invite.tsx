import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { getPairByToken, acceptInvite } from '@/src/lib/pairs';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

/**
 * 딥링크 진입점: deathafter://invite?token=TOKEN
 *
 * 케이스 A — 미로그인: 토큰 보관 → (auth)/welcome으로 이동
 * 케이스 B — 로그인 상태: 즉시 페어 수락 → (tabs)로 이동
 */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, setPendingInviteToken } = useAuth();

  const [state, setState] = useState<'loading' | 'invalid' | 'done'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      setErrorMsg('초대 링크가 올바르지 않습니다.');
      return;
    }
    handleInvite();
  }, [token, session]);

  async function handleInvite() {
    setState('loading');
    try {
      const pair = await getPairByToken(token as string);
      if (!pair) {
        setState('invalid');
        setErrorMsg('이미 사용되었거나 유효하지 않은 초대 링크입니다.');
        return;
      }

      if (!session) {
        // 미로그인 — 토큰 보관 후 가입/로그인 화면으로
        await setPendingInviteToken(token as string);
        router.replace('/(auth)/signup');
        return;
      }

      // 로그인 상태 — 즉시 수락
      if (pair.child_id === session.user.id) {
        setState('invalid');
        setErrorMsg('본인이 만든 초대 링크는 수락할 수 없습니다.');
        return;
      }

      await acceptInvite(token as string, session.user.id, '');
      setState('done');
      setTimeout(() => router.replace('/(tabs)/companion'), 1200);
    } catch (e: unknown) {
      setState('invalid');
      setErrorMsg(e instanceof Error ? e.message : '초대 처리 중 오류가 발생했습니다.');
    }
  }

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>초대 링크를 확인하는 중…</Text>
      </SafeAreaView>
    );
  }

  if (state === 'done') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.successIcon}>🌿</Text>
        <Text style={styles.successTitle}>연결되었어요!</Text>
        <Text style={styles.successBody}>함께 걷는 길이 시작됩니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.errorIcon}>🍂</Text>
      <Text style={styles.errorTitle}>길을 찾지 못했어요</Text>
      <Text style={styles.errorBody}>{errorMsg}</Text>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.replace(session ? '/(tabs)' : '/(auth)')}
      >
        <Text style={styles.buttonText}>처음으로</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  successIcon: { fontSize: 56 },
  successTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  successBody: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  errorIcon: { fontSize: 56 },
  errorTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  errorBody: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  buttonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
});
