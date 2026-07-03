import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Share, Alert, Text, TouchableOpacity } from 'react-native';
import { Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { StepSet } from '../types/drill';
import { decodeSharedStepSet, getShareMessage } from '../utils/stepSharing';
import { palette, radii, shadows, spacing } from '../constants/theme';

interface StepSetsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  stepSets: StepSet[];
  currentStepCount: number;
  onSave: (name: string) => Promise<void>;
  onLoad: (stepSet: StepSet) => void;
  onDelete: (id: string) => Promise<void>;
  onImport: (stepSet: StepSet) => Promise<void>;
}

interface ListActionProps {
  icon: string;
  color?: string;
  onPress: () => void;
}

function ListAction({ icon, color = palette.textSecondary, onPress }: ListActionProps) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={6} style={styles.listAction}>
      <MaterialCommunityIcons name={icon as any} size={19} color={color} />
    </TouchableOpacity>
  );
}

export function StepSetsPanel({
  isVisible,
  onClose,
  stepSets,
  currentStepCount,
  onSave,
  onLoad,
  onDelete,
  onImport,
}: StepSetsPanelProps) {
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [stepSetName, setStepSetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleSave = async () => {
    const trimmedName = stepSetName.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a name for this step set.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedName);
      setStepSetName('');
      setSaveDialogVisible(false);
      Alert.alert('Saved', `"${trimmedName}" has been saved.`);
    } catch (error) {
      Alert.alert('Save failed', 'Could not save this step set.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async (stepSet: StepSet) => {
    try {
      await Share.share({
        message: getShareMessage(stepSet),
        title: `Share ${stepSet.name}`,
      });
    } catch (error) {
      Alert.alert('Share failed', 'Could not open the share sheet.');
      console.error(error);
    }
  };

  const handleDelete = (stepSet: StepSet) => {
    Alert.alert(
      'Delete step set',
      `Delete "${stepSet.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(stepSet.id);
            } catch (error) {
              Alert.alert('Delete failed', 'Could not delete this step set.');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleImportFromClipboard = async () => {
    setIsImporting(true);
    try {
      const clipboardText = await Clipboard.getStringAsync();
      const imported = decodeSharedStepSet(clipboardText);

      if (!imported) {
        Alert.alert(
          'Import failed',
          'Clipboard does not contain a valid badminton step set link.'
        );
        return;
      }

      await onImport(imported);
      Alert.alert('Imported', `"${imported.name}" has been imported and loaded.`);
      onClose();
    } catch (error) {
      Alert.alert('Import failed', 'Could not import from clipboard.');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const canSave = currentStepCount >= 1;

  return (
    <>
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.grabHandle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Drills</Text>
                <Text style={styles.headerSubtitle}>
                  Current sequence: {currentStepCount} step{currentStepCount === 1 ? '' : 's'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={20} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryAction, !canSave && styles.actionDisabled]}
                onPress={() => setSaveDialogVisible(true)}
                disabled={!canSave}
              >
                <MaterialCommunityIcons name="content-save-outline" size={18} color={palette.onAccent} />
                <Text style={styles.primaryActionText}>Save current steps</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryAction, isImporting && styles.actionDisabled]}
                onPress={handleImportFromClipboard}
                disabled={isImporting}
              >
                <MaterialCommunityIcons name="clipboard-arrow-down-outline" size={18} color={palette.accent} />
                <Text style={styles.secondaryActionText}>
                  {isImporting ? 'Importing…' : 'Import from clipboard'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.listLabel}>Saved drills</Text>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {stepSets.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={34} color={palette.textMuted} />
                  <Text style={styles.emptyText}>
                    No saved drills yet.{'\n'}Drag markers to build steps, then save them here.
                  </Text>
                </View>
              ) : (
                stepSets.map((stepSet) => (
                  <View key={stepSet.id} style={styles.listItem}>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemTitle} numberOfLines={1}>{stepSet.name}</Text>
                      <Text style={styles.listItemMeta}>
                        {stepSet.steps.length} steps · {stepSet.isDoubles ? 'Doubles' : 'Singles'}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <ListAction
                        icon="play"
                        color={palette.accent}
                        onPress={() => {
                          onLoad(stepSet);
                          onClose();
                        }}
                      />
                      <ListAction icon="share-variant" onPress={() => handleShare(stepSet)} />
                      <ListAction icon="trash-can-outline" color={palette.danger} onPress={() => handleDelete(stepSet)} />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Portal>
        <Modal
          visible={saveDialogVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSaveDialogVisible(false)}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Save drill</Text>
              <TextInput
                label="Name"
                value={stepSetName}
                onChangeText={setStepSetName}
                mode="outlined"
                style={styles.nameInput}
                autoFocus
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancel}
                  onPress={() => setSaveDialogVisible(false)}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryAction, isSaving && styles.actionDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.primaryActionText}>{isSaving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.overlay,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.hairline,
    paddingBottom: spacing.xl,
    ...shadows.floating,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairlineStrong,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.textPrimary,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
  },
  primaryActionText: {
    color: palette.onAccent,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  secondaryActionText: {
    color: palette.accent,
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  listLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  listItemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  listItemTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  listItemMeta: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.surfaceSunken,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: palette.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: spacing.xl,
    ...shadows.floating,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  nameInput: {
    marginTop: spacing.md,
    backgroundColor: palette.surfaceSunken,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  dialogCancel: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  dialogCancelText: {
    color: palette.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
