import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { getMyAnswerHistory, type AnswerHistoryEntry } from '@/src/lib/answers';
import { colors, typography, spacing, radius, shadows } from '@/src/theme';

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const VISIBILITY_ICON: Record<string, string> = {
  shared:  '🌿',
  private: '🔒',
  later:   '📮',
};

export default function PathScreen() {
  const router = useRouter();
  const [entries, setEntries]     = useState<AnswerHistoryEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getMyAnswerHistory(user.id);
      setEntries(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePress = useCallback((entry: AnswerHistoryEntry) => {
    router.push({
      pathname: '/answer-detail',
      params: {
        answerId:         entry.answer.id,
        questionText:     entry.question_text,
        questionCategory: entry.category,
        isMine:           'true',
      },
    });
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>우리의 길</Text>
        <Text style={styles.subtitle}>함께 걸어온 발자국들</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyTitle}>아직 기록된 이야기가 없어요</Text>
          <Text style={styles.emptySubtitle}>오늘의 질문에 답하면 이곳에 발자국이 쌓여요.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.answer.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item, index }) => (
            <View style={styles.stepRow}>
              <View style={styles.timeline}>
                <View style={styles.dot} />
                {index < entries.length - 1 && <View style={styles.line} />}
              </View>
              <TouchableOpacity
                style={styles.stepCard}
                onPress={() => handlePress(item)}
                activeOpacity={0.8}
              >
                <View style={styles.stepCardHeader}>
                  <Text style={styles.stepDate}>{formatKoreanDate(item.assigned_date)}</Text>
                  <Text style={styles.visibilityIcon}>{VISIBILITY_ICON[item.answer.visibility] ?? ''}</Text>
                </View>
                <Text style={styles.stepCategory}>{item.category}</Text>
                <Text style={styles.stepPreview} numberOfLines={2}>
                  {item.answer.text_content
                    ?? item.answer.audio_transcript
                    ?? (item.answer.audio_url ? '🎙 음성 답변' : '')}
                </Text>
                {item.answer.photo_urls.length > 0 && (
                  <Text style={styles.photoIndicator}>📷 사진 {item.answer.photo_urls.length}장</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyIcon:    { fontSize: 48 },
  emptyTitle:   { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle:{ fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: typography.size.sm * typography.lineHeight.normal },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  stepRow: { flexDirection: 'row', marginBottom: spacing.md },
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
  stepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepDate:    { fontSize: typography.size.xs, color: colors.textDisabled },
  visibilityIcon: { fontSize: 14 },
  stepCategory:{
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  stepPreview: {
    fontSize: typography.size.md,
    color: colors.textPrimary,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  photoIndicator: {
    marginTop: spacing.xs,
    fontSize: typography.size.xs,
    color: colors.textDisabled,
  },
});
