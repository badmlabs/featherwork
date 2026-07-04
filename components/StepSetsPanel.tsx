import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Share, Text, TouchableOpacity } from 'react-native';
import { appAlert } from '../utils/appAlert';
import { Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { StepSet } from '../types/drill';
import { decodeSharedStepSet, getShareMessage } from '../utils/stepSharing';
import { palette, radii, shadows, sora, spacing } from '../constants/theme';

interface StepSetsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  stepSets: StepSet[];
  currentStepCount: number;
  onSave: (name: string) => Promise<boolean>;
  onLoad: (stepSet: StepSet) => void;
  onDelete: (id: string) => Promise<void>;
  onImport: (stepSet: StepSet) => Promise<void>;
}

interface ListActionProps {
  icon: string;
  variant?: 'primary' | 'glass' | 'danger';
  onPress: () => void;
}

function ListAction({ icon, variant = 'glass', onPress }: ListActionProps) {
  const color =
    variant === 'primary' ? palette.onAccent : variant === 'danger' ? palette.danger : palette.textPrimary;
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.listAction,
        variant === 'primary' && styles.listActionPrimary,
        variant === 'danger' && styles.listActionDanger,
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={17} color={color} />
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
      appAlert('Name required', 'Please enter a name for this step set.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await onSave(trimmedName);
      setSaveDialogVisible(false);
      if (saved) {
        setStepSetName('');
        appAlert('Saved', `"${trimmedName}" has been saved.`);
      }
    } catch (error) {
      appAlert('Save failed', 'Could not save this step set.');
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
      appAlert('Share failed', 'Could not open the share sheet.');
      console.error(error);
    }
  };

  const handleDelete = (stepSet: StepSet) => {
    appAlert(
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
              appAlert('Delete failed', 'Could not delete this step set.');
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
        appAlert(
          'Import failed',
          'Clipboard does not contain a valid badminton step set link.'
        );
        return;
      }

      await onImport(imported);
      appAlert('Imported', `"${imported.name}" has been imported and loaded.`);
      onClose();
    } catch (error) {
      appAlert('Import failed', 'Could not import from clipboard.');
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
                  Current sequence · {currentStepCount} step{currentStepCount === 1 ? '' : 's'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={18} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryAction, !canSave && styles.actionDisabled]}
                onPress={() => setSaveDialogVisible(true)}
                disabled={!canSave}
              >
                <MaterialCommunityIcons name="tray-arrow-down" size={18} color={palette.onAccent} />
                <Text style={styles.primaryActionText}>Save current steps</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryAction, isImporting && styles.actionDisabled]}
                onPress={handleImportFromClipboard}
                disabled={isImporting}
              >
                <MaterialCommunityIcons name="clipboard-arrow-down-outline" size={18} color={palette.textPrimary} />
                <Text style={styles.secondaryActionText}>
                  {isImporting ? 'Importing…' : 'Import from clipboard'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.listLabel}>Saved drills</Text>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {stepSets.length === 0 ? (
                <Text style={styles.emptyText}>
                  No saved drills yet — build steps, then save them here.
                </Text>
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
                        variant="primary"
                        onPress={() => {
                          onLoad(stepSet);
                          onClose();
                        }}
                      />
                      <ListAction icon="share-variant" onPress={() => handleShare(stepSet)} />
                      <ListAction icon="trash-can-outline" variant="danger" onPress={() => handleDelete(stepSet)} />
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
    borderTopWidth: 1,
    borderColor: palette.surfaceBorder,
    paddingBottom: spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.55,
    shadowRadius: 25,
    elevation: 16,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4.5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    marginTop: 10,
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
    ...sora('600'),
    fontSize: 19,
    color: palette.textPrimary,
  },
  headerSubtitle: {
    ...sora('400'),
    fontSize: 11.5,
    color: palette.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    gap: 10,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 50,
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    ...shadows.amberGlow,
  },
  primaryActionText: {
    ...sora('700'),
    color: palette.onAccent,
    fontSize: 14,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
  },
  secondaryActionText: {
    ...sora('600'),
    color: palette.textPrimary,
    fontSize: 14,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  listLabel: {
    ...sora('700'),
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: palette.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    gap: 6,
    paddingBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
  },
  listItemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  listItemTitle: {
    ...sora('600'),
    color: palette.textPrimary,
    fontSize: 14,
  },
  listItemMeta: {
    ...sora('400'),
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11.5,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listActionPrimary: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  listActionDanger: {
    backgroundColor: 'rgba(255, 116, 85, 0.14)',
    borderColor: 'rgba(255, 116, 85, 0.40)',
  },
  emptyText: {
    ...sora('400'),
    color: palette.textSecondary,
    fontSize: 12.5,
    paddingVertical: spacing.md,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: palette.overlayStrong,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: palette.dialog,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.dialogBorder,
    padding: spacing.xl,
    ...shadows.floating,
  },
  dialogTitle: {
    ...sora('600'),
    fontSize: 16.5,
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
    ...sora('600'),
    color: palette.textSecondary,
    fontSize: 14,
  },
});
