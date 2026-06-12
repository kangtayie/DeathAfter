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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { acceptInvite } from '@/src/lib/pairs';
import { supabase } from '@/src/lib/supabase';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, pendingInviteToken, setPendingInviteToken } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const hasInvite = !!pendingInviteToken;

  async function handleSignUp() {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert('안내', '모든 항목을 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('안내', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim());

      // 초대 토큰이 있으면 페어링 수락 후 온보딩으로
      if (pendingInviteToken) {
        // signUp 직후 session이 아직 없을 수 있어 auth.getUser() 사용
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await acceptInvite(pendingInviteToken, user.id, '');
          await setPendingInviteToken(null);
          router.replace('/(onboarding)');
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '가입 중 오류가 발생했습니다.';
      Alert.alert('길을 여는 중 오류가 생겼어요', msg);
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
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)')} style={styles.backButton}>
              <Text style={styles.backText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {hasInvite ? '초대를 받으셨군요 :)' : '새 여정을 시작해요'}
            </Text>
            {hasInvite && (
              <Text style={styles.inviteBadge}>
                초대 링크로 오셨어요. 가입 후 자동으로 연결됩니다.
              </Text>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>이름 (닉네임)</Text>
              <TextInput
                style={styles.input}
                placeholder="불리고 싶은 이름"
                placeholderTextColor={colors.textDisabled}
                value={displayName}
                onChangeText={setDisplayName}
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

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
                placeholder="6자 이상"
                placeholderTextColor={colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {hasInvite ? '가입하고 연결하기' : '가입하기'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>이미 계정이 있으신가요? 로그인</Text>
          </TouchableOpacity>
        </ScrollView>
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
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  inviteBadge: {
    fontSize: typography.size.sm,
    color: colors.secondary,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
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
  loginLink: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
