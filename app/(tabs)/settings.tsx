import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, touchTarget } from '@/src/theme';

type SettingRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
};

function SettingRow({ label, value, onPress }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프로필</Text>
        <SettingRow label="이름" value="나그네" />
        <SettingRow label="역할" value="자식" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림</Text>
        <SettingRow label="질문 받는 시간" value="오전 9:00" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기록</Text>
        <SettingRow label="기록 내보내기 (관리자용)" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
        <SettingRow label="로그아웃" />
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
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.min,
    marginBottom: spacing.xs,
  },
  rowLabel: {
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  rowValue: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
});
