import { StyleSheet, View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadows } from '@/src/theme';

const MOCK_STEPS = [
  { id: '1', date: '6월 10일', preview: '어릴 때 살던 동네 골목길이 생각나...' },
  { id: '2', date: '6월 9일', preview: '아버지와 함께 낚시를 갔던 기억...' },
  { id: '3', date: '6월 8일', preview: '첫 직장에서 처음 받은 월급으로...' },
];

export default function PathScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>우리의 길</Text>
        <Text style={styles.subtitle}>함께 걸어온 발자국들</Text>
      </View>

      <FlatList
        data={MOCK_STEPS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.stepRow}>
            <View style={styles.timeline}>
              <View style={styles.dot} />
              {index < MOCK_STEPS.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.stepCard}>
              <Text style={styles.stepDate}>{item.date}</Text>
              <Text style={styles.stepPreview}>{item.preview}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timeline: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.md,
    marginTop: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    marginBottom: -spacing.md,
  },
  stepCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  stepDate: {
    fontSize: typography.size.xs,
    color: colors.textDisabled,
    marginBottom: spacing.xs,
  },
  stepPreview: {
    fontSize: typography.size.md,
    color: colors.textPrimary,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
});
