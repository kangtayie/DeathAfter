import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

export default function CompanionScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>동행자</Text>
        <Text style={styles.subtitle}>함께 길을 걷고 있는 분</Text>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🌿</Text>
        <Text style={styles.emptyTitle}>아직 동행자가 없어요</Text>
        <Text style={styles.emptyDescription}>
          소중한 분을 초대해{'\n'}함께 이 길을 걸어보세요.
        </Text>
        <TouchableOpacity style={styles.inviteButton} activeOpacity={0.8}>
          <Text style={styles.inviteButtonText}>초대 링크 만들기</Text>
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
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    marginBottom: spacing.xl,
  },
  inviteButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  inviteButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
});
