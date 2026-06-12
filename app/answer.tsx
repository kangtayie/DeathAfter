import { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/src/lib/supabase';
import { submitAnswer, type Visibility } from '@/src/lib/answers';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

type Mode = 'voice' | 'text';
type RecordState = 'idle' | 'recording' | 'done';

const DEPTH_LABEL = ['', '1단계', '2단계', '3단계', '4단계', '5단계'] as const;

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; sub: string }> = [
  { value: 'shared',  label: '지금 공유',    sub: '상대방이 바로 볼 수 있어요' },
  { value: 'private', label: '나만 보기',    sub: '나만 볼 수 있어요' },
  { value: 'later',   label: '나중에 전달',  sub: '나중에 전달할 수 있어요' },
];

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AnswerScreen() {
  const { assignmentId, questionText, questionCategory, questionDepthLevel } =
    useLocalSearchParams<{
      assignmentId: string;
      questionText: string;
      questionCategory: string;
      questionDepthLevel: string;
    }>();
  const router = useRouter();

  const [mode, setMode]               = useState<Mode | null>(null);
  const [textContent, setTextContent]   = useState('');
  const [recordState, setRecordState]   = useState<RecordState>('idle');
  const [recordedUri, setRecordedUri]   = useState<string | null>(null);
  const [duration, setDuration]         = useState(0);
  const [photoUris, setPhotoUris]       = useState<string[]>([]);
  const [visibility, setVisibility]     = useState<Visibility>('shared');
  const [submitting, setSubmitting]     = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const recordingRef   = useRef<Audio.Recording | null>(null);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim      = useRef(new Animated.Value(1)).current;
  const pulseLoopRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
      pulseLoopRef.current?.stop();
    };
  }, []);

  const startPulse = useCallback(() => {
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulseLoopRef.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [pulseAnim]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('마이크 권한 필요', '설정에서 마이크 권한을 허용해주세요.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setRecordState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      startPulse();
    } catch {
      Alert.alert('오류', '녹음을 시작할 수 없어요. 다시 시도해주세요.');
    }
  }, [startPulse]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopPulse();
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI() ?? null;
      recordingRef.current = null;
      setRecordedUri(uri);
      setRecordState('done');
    } catch {
      Alert.alert('오류', '녹음을 완료할 수 없어요. 다시 시도해주세요.');
    }
  }, [stopPulse]);

  const resetRecording = useCallback(() => {
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setRecordedUri(null);
    setRecordState('idle');
    setDuration(0);
    setPlayingAudio(false);
  }, []);

  const togglePlayback = useCallback(async () => {
    if (!recordedUri) return;
    if (playingAudio && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlayingAudio(false);
      return;
    }
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: recordedUri },
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
      Alert.alert('오류', '녹음을 재생할 수 없어요.');
    }
  }, [recordedUri, playingAudio]);

  const pickPhotos = useCallback(async () => {
    if (photoUris.length >= 5) {
      Alert.alert('사진은 최대 5장까지 첨부할 수 있어요.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('사진 권한 필요', '설정에서 사진 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - photoUris.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUris(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  }, [photoUris.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotoUris(prev => prev.filter((_, i) => i !== index));
  }, []);

  const canSubmit =
    mode === 'voice' ? recordState === 'done' : textContent.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSubmitting(true);
    try {
      await submitAnswer({
        assignmentId,
        userId: user.id,
        textContent: mode === 'text' ? textContent.trim() : undefined,
        audioUri:    mode === 'voice' ? (recordedUri ?? undefined) : undefined,
        photoUris,
        visibility,
      });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('저장 오류', '답변을 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, submitting, mode, textContent, recordedUri, photoUris, visibility, assignmentId, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backBtn}>← 돌아가기</Text>
          </TouchableOpacity>
        </View>

        {/* 질문 카드 */}
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>오늘의 질문</Text>
          <Text style={styles.questionText}>{questionText}</Text>
          <Text style={styles.questionMeta}>
            {questionCategory} · 깊이 {DEPTH_LABEL[Number(questionDepthLevel)] ?? ''}
          </Text>
        </View>

        {/* 모드 선택 */}
        {!mode && (
          <View style={styles.modeSection}>
            <Text style={styles.modeTitle}>어떻게 답변하실까요?</Text>
            <TouchableOpacity style={styles.voiceModeBtn} onPress={() => setMode('voice')} activeOpacity={0.85}>
              <Text style={styles.voiceModeBtnIcon}>🎙</Text>
              <View>
                <Text style={styles.voiceModeBtnLabel}>말씀으로 답하기</Text>
                <Text style={styles.voiceModeBtnSub}>버튼 하나로 간편하게 녹음해요</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textModeBtn} onPress={() => setMode('text')} activeOpacity={0.85}>
              <Text style={styles.textModeBtnText}>✏️ 글로 답하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 음성 모드 */}
        {mode === 'voice' && (
          <View style={styles.voiceSection}>
            {recordState === 'idle' && (
              <>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity style={styles.recordBtn} onPress={startRecording} activeOpacity={0.85}>
                    <Text style={styles.recordBtnIcon}>🎙</Text>
                    <Text style={styles.recordBtnLabel}>눌러서 말씀해주세요</Text>
                  </TouchableOpacity>
                </Animated.View>
                <Text style={styles.recordHint}>버튼을 누르면 녹음이 시작돼요</Text>
              </>
            )}

            {recordState === 'recording' && (
              <>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity style={[styles.recordBtn, styles.recordBtnActive]} onPress={stopRecording} activeOpacity={0.85}>
                    <View style={styles.stopIcon} />
                    <Text style={styles.recordBtnLabel}>완료하려면 누르세요</Text>
                  </TouchableOpacity>
                </Animated.View>
                <View style={styles.recordingBadge}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>{formatDuration(duration)}</Text>
                </View>
              </>
            )}

            {recordState === 'done' && (
              <View style={styles.doneSection}>
                <View style={styles.playbackRow}>
                  <TouchableOpacity style={styles.playBtn} onPress={togglePlayback} activeOpacity={0.8}>
                    <Text style={styles.playBtnText}>{playingAudio ? '⏸' : '▶'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.recordedLabel}>
                    {playingAudio ? '재생 중...' : `녹음 완료 · ${formatDuration(duration)}`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.reRecordBtn} onPress={resetRecording} activeOpacity={0.8}>
                  <Text style={styles.reRecordBtnText}>다시 녹음하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 텍스트 모드 */}
        {mode === 'text' && (
          <View style={styles.textSection}>
            <TextInput
              style={styles.textInput}
              value={textContent}
              onChangeText={setTextContent}
              placeholder="여기에 이야기를 써주세요..."
              placeholderTextColor={colors.textDisabled}
              multiline
              textAlignVertical="top"
              autoFocus={Platform.OS !== 'web'}
            />
          </View>
        )}

        {/* 사진 첨부 */}
        {!!mode && (
          <View style={styles.photoSection}>
            <Text style={styles.sectionLabel}>사진 첨부 (선택)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {photoUris.map((uri, i) => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                    <Text style={styles.photoRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photoUris.length < 5 && (
                <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhotos} activeOpacity={0.8}>
                  <Text style={styles.photoAddIcon}>＋</Text>
                  <Text style={styles.photoAddLabel}>사진 추가</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* 공개 설정 */}
        {!!mode && (
          <View style={styles.visibilitySection}>
            <Text style={styles.sectionLabel}>공개 설정</Text>
            {VISIBILITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.visibilityRow, visibility === opt.value && styles.visibilityRowActive]}
                onPress={() => setVisibility(opt.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.visibilityRadio, visibility === opt.value && styles.visibilityRadioActive]}>
                  {visibility === opt.value && <View style={styles.visibilityRadioDot} />}
                </View>
                <View>
                  <Text style={[styles.visibilityLabel, visibility === opt.value && styles.visibilityLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.visibilitySub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 저장 버튼 */}
        {!!mode && (
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            disabled={!canSubmit || submitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={colors.textInverse} />
              : <Text style={styles.submitBtnText}>저장하기</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  header: { paddingVertical: spacing.lg },
  backBtn: { fontSize: typography.size.sm, color: colors.primary, fontWeight: typography.weight.medium },

  // 질문 카드
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.md,
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
  questionMeta: { fontSize: typography.size.xs, color: colors.textDisabled },

  // 모드 선택
  modeSection: { marginBottom: spacing.xl },
  modeTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  voiceModeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    minHeight: touchTarget.min * 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  voiceModeBtnIcon:  { fontSize: 32 },
  voiceModeBtnLabel: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.textInverse },
  voiceModeBtnSub:   { fontSize: typography.size.xs, color: colors.textInverse, opacity: 0.85, marginTop: 2 },
  textModeBtn: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  textModeBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.medium, color: colors.textSecondary },

  // 음성 모드
  voiceSection: { alignItems: 'center', marginBottom: spacing.xl, paddingVertical: spacing.xl },
  recordBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
    gap: spacing.sm,
  },
  recordBtnActive: { backgroundColor: colors.error },
  recordBtnIcon:  { fontSize: 48 },
  recordBtnLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textInverse,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  stopIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.textInverse },
  recordHint: {
    marginTop: spacing.lg,
    fontSize: typography.size.sm,
    color: colors.textDisabled,
    textAlign: 'center',
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  recordingTime: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.textPrimary },

  doneSection: { alignItems: 'center', gap: spacing.md, width: '100%' },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
    width: '100%',
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnText: { fontSize: 22, color: colors.textInverse },
  recordedLabel: { fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },
  reRecordBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reRecordBtnText: { fontSize: typography.size.sm, color: colors.textSecondary },

  // 텍스트 모드
  textSection: { marginBottom: spacing.xl },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // 사진 섹션
  photoSection: { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  photoRow: { flexDirection: 'row' },
  photoThumb: { position: 'relative', marginRight: spacing.sm },
  photoImg: { width: 80, height: 80, borderRadius: radius.md },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: { color: colors.textInverse, fontSize: 14, fontWeight: typography.weight.bold, lineHeight: 18 },
  photoAddBtn: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoAddIcon:  { fontSize: 24, color: colors.textDisabled },
  photoAddLabel: { fontSize: typography.size.xs, color: colors.textDisabled },

  // 공개 설정
  visibilitySection: { marginBottom: spacing.xl },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  visibilityRowActive: { borderColor: colors.primary, backgroundColor: colors.background },
  visibilityRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityRadioActive: { borderColor: colors.primary },
  visibilityRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  visibilityLabel:       { fontSize: typography.size.md, fontWeight: typography.weight.medium, color: colors.textPrimary },
  visibilityLabelActive: { color: colors.primary },
  visibilitySub:         { fontSize: typography.size.xs, color: colors.textDisabled, marginTop: 2 },

  // 저장 버튼
  submitBtn: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    minHeight: touchTarget.min * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
});
