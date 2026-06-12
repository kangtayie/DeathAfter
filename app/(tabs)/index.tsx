import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';
import { supabase } from '@/src/lib/supabase';
import { getTodayAssignment, markAnswered, type TodayAssignment } from '@/src/lib/questions';

const DEPTH_LABEL = ['', '1단계', '2단계', '3단계', '4단계', '5단계'] as const;

function formatKoreanDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function TodayScreen() {
  const [assignment, setAssignment] = useState<TodayAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const result = await getTodayAssignment(user.id);
    setAssignment(result);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAnswerSubmit = useCallback(async (mode: 'voice' | 'text') => {
    if (!assignment) return;

    // 음성/텍스트 녹음은 다음 단계에서 구현 — 지금은 확인 후 완료 처리
    Alert.alert(
      mode === 'voice' ? '말씀해주세요' : '글로 답하기',
      '아직 준비 중인 기능이에요.\n오늘의 질문을 마음속으로 생각해보시고, 완료로 표시하시겠어요?',
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '완료로 표시',
          onPress: async () => {
            setSubmitting(true);
            try {
              await markAnswered(assignment.assignmentId);
              setAssignment(prev =>
                prev ? { ...prev, isAnswered: true } : prev,
              );
            } catch {
              Alert.alert('오류', '저장 중 문제가 생겼어요. 다시 시도해주세요.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [assignment]);

  const today = formatKoreanDate(new Date());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.greeting}>오늘의 걸음</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : assignment === null ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              오늘의 질문을 불러오지 못했어요.{'\n'}잠시 후 다시 시도해주세요.
            </Text>
          </View>
        ) : assignment.isAnswered ? (
          <AnsweredState assignment={assignment} />
        ) : (
          <UnansweredState
            assignment={assignment}
            submitting={submitting}
            onAnswer={handleAnswerSubmit}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── 미답변 상태 ─────────────────────────────────────────────────────────── */
function UnansweredState({
  assignment,
  submitting,
  onAnswer,
}: {
  assignment: TodayAssignment;
  submitting: boolean;
  onAnswer: (mode: 'voice' | 'text') => void;
}) {
  return (
    <>
      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>오늘의 질문</Text>
        <Text style={styles.questionText}>{assignment.question.text}</Text>
        <Text style={styles.questionMeta}>
          {assignment.question.category} · 깊이 {DEPTH_LABEL[assignment.question.depthLevel]}
        </Text>
      </View>

      <View style={styles.answerSection}>
        <TouchableOpacity
          style={[styles.voiceButton, submitting && styles.buttonDisabled]}
          activeOpacity={0.8}
          disabled={submitting}
          onPress={() => onAnswer('voice')}
        >
          <Text style={styles.voiceButtonText}>🎙 말씀해주세요</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.textButton, submitting && styles.buttonDisabled]}
          activeOpacity={0.8}
          disabled={submitting}
          onPress={() => onAnswer('text')}
        >
          <Text style={styles.textButtonText}>글로 답하기</Text>
        </TouchableOpacity>
      </View>

      <PartnerStatusBadge
        displayName={assignment.partnerDisplayName}
        answered={assignment.partnerAnswered}
        myAnswered={false}
      />
    </>
  );
}

/* ─── 답변 완료 상태 ──────────────────────────────────────────────────────── */
function AnsweredState({ assignment }: { assignment: TodayAssignment }) {
  return (
    <>
      <View style={styles.completedCard}>
        <Text style={styles.completedIcon}>✓</Text>
        <Text style={styles.completedTitle}>오늘의 이야기를 나눠주셨어요</Text>
        <Text style={styles.completedQuestion}>"{assignment.question.text}"</Text>
        <Text style={styles.completedMeta}>
          {assignment.question.category} · 깊이 {DEPTH_LABEL[assignment.question.depthLevel]}
        </Text>
      </View>

      <View style={styles.tomorrowCard}>
        <Text style={styles.tomorrowText}>내일 또 만나요 🌿</Text>
        <Text style={styles.tomorrowSub}>
          매일 한 걸음씩, 소중한 이야기를 쌓아가고 있어요.
        </Text>
      </View>

      <PartnerStatusBadge
        displayName={assignment.partnerDisplayName}
        answered={assignment.partnerAnswered}
        myAnswered
      />
    </>
  );
}

/* ─── 파트너 답변 현황 배지 ───────────────────────────────────────────────── */
function PartnerStatusBadge({
  displayName,
  answered,
  myAnswered,
}: {
  displayName: string | null;
  answered: boolean | null;
  myAnswered: boolean;
}) {
  if (displayName === null) return null;

  const name = displayName || '상대방';

  let message: string;
  if (answered === null || answered === false) {
    message = myAnswered
      ? `${name}님은 아직 오늘의 질문에 답하시는 중이에요.`
      : `${name}님도 오늘 질문을 기다리고 있어요.`;
  } else {
    message = myAnswered
      ? `${name}님도 오늘 답변하셨어요! 서로의 이야기가 쌓이고 있어요.`
      : `${name}님이 오늘 먼저 답변하셨어요!`;
  }

  return (
    <View style={[styles.partnerBadge, answered && styles.partnerBadgeActive]}>
      <Text style={styles.partnerDot}>{answered ? '●' : '○'}</Text>
      <Text style={styles.partnerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
  loadingBox: {
    paddingTop: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyBox: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },

  // 질문 카드
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

  // 답변 버튼
  answerSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
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
  buttonDisabled: {
    opacity: 0.5,
  },

  // 완료 카드
  completedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
    alignItems: 'center',
    borderTopWidth: 4,
    borderTopColor: colors.success,
  },
  completedIcon: {
    fontSize: 32,
    color: colors.success,
    marginBottom: spacing.md,
  },
  completedTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.success,
    marginBottom: spacing.md,
  },
  completedQuestion: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  completedMeta: {
    fontSize: typography.size.xs,
    color: colors.textDisabled,
  },

  // 내일 카드
  tomorrowCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  tomorrowText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  tomorrowSub: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // 파트너 배지
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  partnerBadgeActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  partnerDot: {
    fontSize: 12,
    color: colors.textDisabled,
  },
  partnerText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});
