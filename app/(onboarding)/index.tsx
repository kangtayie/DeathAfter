import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

// 부모용 온보딩 1화면 — 세계관 환영
export default function OnboardingWelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconArea}>
          <Text style={styles.icon}>🌿</Text>
        </View>

        <Text style={styles.title}>함께 걷게 되어{'\n'}반갑습니다.</Text>
        <Text style={styles.body}>
          이 길에서 자녀분이 매일 하나의 질문을 드릴 거예요.{'\n\n'}
          당신의 이야기, 기억, 감정 — 어떤 것이든 좋습니다.{'\n'}
          말씀해주시는 것 하나하나가 소중한 발자국이 됩니다.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/(onboarding)/first-question')}
      >
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconArea: {
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: typography.size.xxl * typography.lineHeight.tight,
    marginBottom: spacing.xl,
  },
  body: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touchTarget.min * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  buttonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
});
