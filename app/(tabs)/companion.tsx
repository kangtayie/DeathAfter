import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useAuth } from '@/src/contexts/AuthContext';
import { createInvite, getMyPairs } from '@/src/lib/pairs';
import { supabase } from '@/src/lib/supabase';
import type { PairWithProfiles } from '@/src/types/database';
import { colors, typography, spacing, radius, touchTarget, shadows } from '@/src/theme';

export default function CompanionScreen() {
  const { session } = useAuth();
  const [pairs, setPairs] = useState<PairWithProfiles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);

  // 관계 라벨 입력 모달 (초대 전 '엄마/아빠' 선택)
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [relationshipLabel, setRelationshipLabel] = useState('');

  const loadPairs = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getMyPairs(session.user.id);
      setPairs(data);
    } catch {
      // pairs 로딩 실패는 조용히 처리
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadPairs();
  }, [loadPairs]);

  async function handleCreateInvite() {
    if (!session || !relationshipLabel.trim()) {
      Alert.alert('안내', '관계를 입력해주세요. (예: 엄마, 아빠)');
      return;
    }

    setIsInviting(true);
    setLabelModalVisible(false);
    try {
      const pair = await createInvite(session.user.id);

      // 관계 라벨 업데이트
      await supabase
        .from('pairs')
        .update({ relationship_label: relationshipLabel.trim() })
        .eq('id', pair.id);

      // 딥링크 생성: deathafter://invite?token=TOKEN
      const inviteUrl = Linking.createURL('invite', {
        queryParams: { token: pair.invite_token },
      });

      await Share.share({
        message: `저와 함께 길을 걸어요 :)\n\n${inviteUrl}`,
        title: 'DeathAfter 초대',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '초대 링크 생성 중 오류가 발생했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setIsInviting(false);
      setRelationshipLabel('');
    }
  }

  function renderPairItem({ item }: { item: PairWithProfiles }) {
    const isParent = item.parent_id === session?.user.id;
    const companion = isParent ? item.child : item.parent;
    const myRole = isParent ? '부모' : '자식';

    return (
      <View style={styles.pairCard}>
        <View style={styles.pairAvatar}>
          <Text style={styles.pairAvatarText}>
            {companion?.display_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.pairInfo}>
          <Text style={styles.pairName}>
            {item.relationship_label || companion?.display_name || '동행자'}
          </Text>
          <Text style={styles.pairMeta}>
            {companion?.display_name} · 나는 {myRole}
          </Text>
        </View>
        <View style={styles.pairStatus}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>동행 중</Text>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>동행자</Text>
        <Text style={styles.subtitle}>함께 길을 걷고 있는 분</Text>
      </View>

      {pairs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyTitle}>아직 동행자가 없어요</Text>
          <Text style={styles.emptyDescription}>
            소중한 분을 초대해{'\n'}함께 이 길을 걸어보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pairs}
          keyExtractor={(item) => item.id}
          renderItem={renderPairItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <TouchableOpacity
        style={[styles.inviteButton, isInviting && styles.inviteButtonDisabled]}
        activeOpacity={0.8}
        onPress={() => setLabelModalVisible(true)}
        disabled={isInviting}
      >
        {isInviting ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.inviteButtonText}>+ 부모님 초대하기</Text>
        )}
      </TouchableOpacity>

      {/* 관계 라벨 입력 모달 */}
      <Modal
        visible={labelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLabelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>어떤 분을 초대하시나요?</Text>
            <Text style={styles.modalSubtitle}>관계를 입력해주세요</Text>

            <View style={styles.labelPresets}>
              {['엄마', '아빠', '할머니', '할아버지'].map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.labelChip,
                    relationshipLabel === label && styles.labelChipSelected,
                  ]}
                  onPress={() => setRelationshipLabel(label)}
                >
                  <Text
                    style={[
                      styles.labelChipText,
                      relationshipLabel === label && styles.labelChipTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.labelInput}
              placeholder="직접 입력"
              placeholderTextColor={colors.textDisabled}
              value={relationshipLabel}
              onChangeText={setRelationshipLabel}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setLabelModalVisible(false);
                  setRelationshipLabel('');
                }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCreateInvite}
              >
                <Text style={styles.modalConfirmText}>초대 링크 만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
  pairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  pairAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairAvatarText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
  pairInfo: {
    flex: 1,
  },
  pairName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pairMeta: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  pairStatus: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textInverse,
  },
  inviteButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.lg,
    ...shadows.md,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44,26,14,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  labelPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  labelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  labelChipText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  labelChipTextSelected: {
    color: colors.textInverse,
  },
  labelInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: touchTarget.min * 1.1,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 2,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  modalConfirmText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
});
