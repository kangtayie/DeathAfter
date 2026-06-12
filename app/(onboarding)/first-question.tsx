import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

// 부모용 온보딩 2화면 — 첫 질문 안내
export default function FirstQuestionScreen() {
  const router = useRouter();
  const { clearNewUser } = useAuth();

  function handleStart() {
    clearNewUser();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>첫 번째 걸음</Text>
        <Text style={styles.title}>곧 첫 질문이{'\n'}도착할 거예요.</Text>

        <View style={styles.questionPreview}>
          <Text style={styles.questionLabel}>오늘의 질문 예시</Text>
          <Text style={styles.questionText}>
            어린 시절, 가장 자주 가던 동네 가게가 있었나요?
          </Text>
        </View>

        <Text style={styles.hint}>
          말씀해주시거나 글로 쓰셔도 됩니다.{'\n'}
          짧아도 괜찮아요. 당신의 언어로 충분합니다.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={handleStart}
      >
        <Text style={styles.buttonText}>길을 시작할게요</Text>
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
  eyebrow: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: typography.size.xxl * typography.lineHeight.tight,
    marginBottom: spacing.xl,
  },
  questionPreview: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.xl,
  },
  questionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  hint: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  button: {
    backgroundColor: colors.secondary,
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
