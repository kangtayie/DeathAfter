import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.worldview}>
        <Text style={styles.tagline}>삶은 여정이고,{'\n'}나는 나그네입니다.</Text>
        <Text style={styles.subtitle}>
          소중한 사람과 걸어온 길을,{'\n'}함께 기록해보세요.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.primaryButtonText}>새 여정 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>이미 걷고 있어요</Text>
        </TouchableOpacity>

        {/* TODO: 카카오 로그인 */}
      </View>

      <Text style={styles.appName}>DeathAfter</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  worldview: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  tagline: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: typography.size.xxxl * typography.lineHeight.tight,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touchTarget.min * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  primaryButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
  secondaryButton: {
    borderRadius: radius.md,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  appName: {
    textAlign: 'center',
    fontSize: typography.size.xs,
    color: colors.textDisabled,
    letterSpacing: 2,
  },
});
