import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { acceptInvite } from '@/src/lib/pairs';
import { supabase } from '@/src/lib/supabase';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, pendingInviteToken, setPendingInviteToken } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('안내', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email.trim(), password);

      // 로그인 성공 후 대기 중인 초대 토큰 처리
      if (pendingInviteToken) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await acceptInvite(pendingInviteToken, user.id, '');
          await setPendingInviteToken(null);
        }
      }
      // Stack.Protected가 자동으로 (tabs)로 리다이렉트
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.';
      Alert.alert('로그인 실패', msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.title}>다시 오셨군요</Text>
            <Text style={styles.subtitle}>계속해서 걸어볼까요.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor={colors.textDisabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor={colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>로그인</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => router.replace('/(auth)/signup')}
          >
            <Text style={styles.signupLinkText}>아직 계정이 없으신가요? 가입하기</Text>
          </TouchableOpacity>

          {/* TODO: 카카오 로그인 */}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: touchTarget.min * 1.2,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touchTarget.min * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
  signupLink: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
