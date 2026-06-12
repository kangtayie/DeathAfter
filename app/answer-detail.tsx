import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { getAnswerById, getSignedUrl, type Answer } from '@/src/lib/answers';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

const VISIBILITY_LABEL: Record<string, string> = {
  shared:  '지금 공유',
  private: '나만 보기',
  later:   '나중에 전달',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function AnswerDetailScreen() {
  const { answerId, questionText, questionCategory, isMine } = useLocalSearchParams<{
    answerId: string;
    questionText: string;
    questionCategory: string;
    isMine: string;
  }>();
  const router = useRouter();

  const [answer, setAnswer]         = useState<Answer | null>(null);
  const [loading, setLoading]       = useState(true);
  const [audioUrl, setAudioUrl]     = useState<string | null>(null);
  const [photoUrls, setPhotoUrls]   = useState<string[]>([]);
  const [playingAudio, setPlayingAudio] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (!answerId) { setLoading(false); return; }
    (async () => {
      try {
        const data = await getAnswerById(answerId);
        if (!data) { setLoading(false); return; }
        setAnswer(data);

        if (data.audio_url) {
          try {
            const url = await getSignedUrl('answer-audio', data.audio_url);
            setAudioUrl(url);
          } catch { /* audio not accessible */ }
        }

        if (data.photo_urls.length > 0) {
          const urls = await Promise.all(
            data.photo_urls.map(p => getSignedUrl('answer-photos', p).catch(() => null)),
          );
          setPhotoUrls(urls.filter(Boolean) as string[]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [answerId]);

  const togglePlayback = useCallback(async () => {
    if (!audioUrl) return;
    if (playingAudio && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlayingAudio(false);
      return;
    }
    try {
      if (!soundRef.current) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) setPlayingAudio(false);
          },
        );
        soundRef.current = sound;
      } else {
        await soundRef.current.playFromPositionAsync(0);
      }
      setPlayingAudio(true);
    } catch {
      Alert.alert('오류', '오디오를 재생할 수 없어요.');
    }
  }, [audioUrl, playingAudio]);

  const mine = isMine === 'true';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!answer) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>답변을 불러올 수 없어요.</Text>
          <TouchableOpacity style={styles.backLinkBtn} onPress={() => router.back()}>
            <Text style={styles.backLink}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backBtn}>← 돌아가기</Text>
          </TouchableOpacity>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>{mine ? '나의 답변' : '상대방 답변'}</Text>
          </View>
        </View>

        {/* 질문 */}
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>{questionCategory ?? ''}</Text>
          <Text style={styles.questionText}>{questionText ?? ''}</Text>
          <Text style={styles.questionDate}>{formatDate(answer.created_at)}</Text>
        </View>

        {/* 공개 설정 (내 답변일 때만) */}
        {mine && (
          <View style={styles.visibilityBadge}>
            <Text style={styles.visibilityBadgeText}>
              {VISIBILITY_LABEL[answer.visibility] ?? answer.visibility}
            </Text>
          </View>
        )}

        {/* 오디오 플레이어 */}
        {audioUrl && (
          <View style={styles.audioCard}>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlayback} activeOpacity={0.8}>
              <Text style={styles.playBtnIcon}>{playingAudio ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
            <View style={styles.audioInfo}>
              <Text style={styles.audioTitle}>음성 답변</Text>
              <Text style={styles.audioSubtitle}>
                {playingAudio ? '재생 중...' : '탭하여 재생'}
              </Text>
            </View>
          </View>
        )}

        {/* 텍스트 내용 */}
        {answer.text_content && (
          <View style={styles.textCard}>
            <Text style={styles.textContent}>{answer.text_content}</Text>
          </View>
        )}

        {/* 텍스트가 없고 STT 전사본이 있을 때 */}
        {!answer.text_content && answer.audio_transcript && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>음성 내용 (자동 변환)</Text>
            <Text style={styles.transcriptText}>{answer.audio_transcript}</Text>
          </View>
        )}

        {/* 사진 */}
        {photoUrls.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionLabel}>사진</Text>
            <View style={styles.photosGrid}>
              {photoUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.photoImg} resizeMode="cover" />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  backBtn:     { fontSize: typography.size.sm, color: colors.primary, fontWeight: typography.weight.medium },
  ownerBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  ownerBadgeText: { fontSize: typography.size.xs, fontWeight: typography.weight.medium, color: colors.textSecondary },

  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.md,
  },
  questionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
    lineHeight: typography.size.lg * typography.lineHeight.relaxed,
    marginBottom: spacing.sm,
  },
  questionDate: { fontSize: typography.size.xs, color: colors.textDisabled },

  visibilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  visibilityBadgeText: { fontSize: typography.size.xs, color: colors.textSecondary },

  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnIcon:  { fontSize: 24, color: colors.textInverse },
  audioInfo:    { flex: 1 },
  audioTitle:   { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.textPrimary },
  audioSubtitle:{ fontSize: typography.size.sm, color: colors.textDisabled, marginTop: 2 },

  textCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  textContent: {
    fontSize: typography.size.md,
    color: colors.textPrimary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },

  transcriptCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  transcriptLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textDisabled,
    marginBottom: spacing.sm,
  },
  transcriptText: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    fontStyle: 'italic',
  },

  photosSection: { marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoImg: { width: '48%', aspectRatio: 1, borderRadius: radius.md },

  emptyText: { fontSize: typography.size.md, color: colors.textSecondary },
  backLinkBtn: { paddingVertical: spacing.sm },
  backLink:   { fontSize: typography.size.sm, color: colors.primary, fontWeight: typography.weight.medium },
});
