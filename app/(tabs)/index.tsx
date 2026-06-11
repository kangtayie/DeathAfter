import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

export default function TodayScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>오늘의 걸음</Text>
        <Text style={styles.date}>2026년 6월 11일</Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>오늘의 질문</Text>
        <Text style={styles.questionText}>
          어린 시절, 가장 자주 가던 동네 가게가 있었나요?
        </Text>
        <Text style={styles.questionMeta}>유년 시절 · 깊이 1단계</Text>
      </View>

      <View style={styles.answerSection}>
        <TouchableOpacity style={styles.voiceButton} activeOpacity={0.8}>
          <Text style={styles.voiceButtonText}>🎙 말씀해주세요</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textButton} activeOpacity={0.8}>
          <Text style={styles.textButtonText}>글로 답하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingVertical: spacing.xl,
  },
  greeting: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
    lineHeight: typography.size.lg * typography.lineHeight.relaxed,
    marginBottom: spacing.md,
  },
  questionMeta: {
    fontSize: typography.size.xs,
    color: colors.textDisabled,
  },
  answerSection: {
    gap: spacing.md,
  },
  voiceButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touchTarget.min * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  voiceButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
  textButton: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  textButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
});
