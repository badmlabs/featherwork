import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Pressable, LayoutChangeEvent } from 'react-native';
import { appAlert } from '../utils/appAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { PlayerMarker } from './PlayerMarker';
import { IconButton } from './IconButton';
import { CourtSvg } from './CourtSvg';
import { useCourtPositions } from '../hooks/useCourtPositions';
import { useStepSets } from '../hooks/useStepSets';
import { PositionTrail } from './PositionTrail';
import { SettingsPanel } from './SettingsPanel';
import { DrillHubPanel, DrillHubTab } from './DrillHubPanel';
import { drillStepsForCourt, VaultDrill } from '../data/vaultDrills';
import { FREE_SAVED_DRILL_LIMIT, useVaultAccess } from '../hooks/useVaultAccess';
import { useMarkerCustomization } from '../context/MarkerCustomizationContext';
import { createStepSet, decodeSharedStepSet } from '../utils/stepSharing';
import { StepSet } from '../types/drill';
import { palette, radii, shadows, sora, spacing } from '../constants/theme';

const HEADER_HEIGHT = 44;
const DOCK_PADDING = 10;
const LINES_SIDE_INSET = 30;
const LINES_GAP = 16;

// Module-level so remounts (e.g. via the +not-found redirect) never
// re-import a URL that was already handled in this app session.
const consumedShareUrls = new Set<string>();

export default function BadmintonCourt() {
  const insets = useSafeAreaInsets();

  // Measured layout is the source of truth: Dimensions.get('window') does not
  // reliably match the rendered container on Android (status/nav bar handling
  // varies per device), which made the court lines run under the dock.
  const [rootSize, setRootSize] = useState<{ width: number; height: number } | null>(null);
  const [courtArea, setCourtArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const headerTop = insets.top + spacing.sm;
  const dockBottom = Math.max(insets.bottom, 14);

  const screenWidth = rootSize?.width ?? Dimensions.get('window').width;
  const screenHeight = rootSize?.height ?? Dimensions.get('window').height;

  // Pre-measure estimate for the first frame only.
  const estimatedDockHeight = DOCK_PADDING * 2 + 46;
  const area = courtArea ?? {
    x: 0,
    y: headerTop + HEADER_HEIGHT,
    width: screenWidth,
    height:
      screenHeight - (headerTop + HEADER_HEIGHT) - (dockBottom + estimatedDockHeight),
  };

  // The painted lines sit inset from the edges; the green mat fills the screen.
  const linesRect = {
    x: LINES_SIDE_INSET,
    y: area.y + LINES_GAP,
    width: area.width - LINES_SIDE_INSET * 2,
    height: area.height - LINES_GAP * 2,
  };
  const courtDimensions = { width: screenWidth, height: screenHeight, linesRect };

  const onRootLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRootSize((prev) =>
      prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
        ? prev
        : { width, height }
    );
  };

  const onCourtAreaLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setCourtArea((prev) =>
      prev &&
      Math.abs(prev.y - y) < 1 &&
      Math.abs(prev.width - width) < 1 &&
      Math.abs(prev.height - height) < 1
        ? prev
        : { x, y, width, height }
    );
  };

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  // null = drill hub closed; otherwise the tab it opens on.
  const [drillHubTab, setDrillHubTab] = useState<DrillHubTab | null>(null);
  const { customizations, updateMarkerCustomization } = useMarkerCustomization();
  const { stepSets, saveStepSet, deleteStepSet, replaceStepSet, importStepSet } = useStepSets();
  const vault = useVaultAccess();

  const {
    isDoubles,
    playerPositions,
    shuttlePosition,
    ghostPositions,
    updatePlayerPosition,
    updateShuttlePosition,
    handlePositionChangeComplete,
    toggleGameMode,
    resetPositions,
    undo,
    redo,
    canUndo,
    canRedo,
    showPlayerTrails,
    showShuttleTrail,
    togglePlayerTrails,
    toggleShuttleTrail,
    getStepsSnapshot,
    loadNormalizedSteps,
    stepCount,
  } = useCourtPositions(courtDimensions);

  // Once the real court area is measured, re-seed the default positions —
  // but only while the board is pristine (nothing moved, no history).
  const measuredKey = courtArea
    ? `${Math.round(courtArea.y)}:${Math.round(courtArea.width)}:${Math.round(courtArea.height)}`
    : '';
  useEffect(() => {
    if (measuredKey && !canUndo && !canRedo) {
      resetPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredKey]);

  const applyImport = useCallback(async (stepSet: StepSet, replaceId?: string) => {
    const saved = replaceId
      ? await replaceStepSet(replaceId, stepSet)
      : await importStepSet(stepSet);
    loadNormalizedSteps(saved.steps, saved.isDoubles);
    appAlert('Imported', `"${saved.name}" has been imported and loaded.`);
  }, [importStepSet, loadNormalizedSteps, replaceStepSet]);

  const handleImportStepSet = useCallback(async (stepSet: StepSet) => {
    const existing = stepSets.find((item) => item.name === stepSet.name);

    if (existing) {
      appAlert(
        'Drill already exists',
        `A drill named "${stepSet.name}" is already saved. Replace it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => applyImport(stepSet, existing.id),
          },
        ]
      );
      return;
    }

    if (!vault.isSubscribed && stepSets.length >= FREE_SAVED_DRILL_LIMIT) {
      appAlert(
        'Saved drills are full',
        `Free keeps ${FREE_SAVED_DRILL_LIMIT} saved drills. Drill Vault Pro removes the limit.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Pro', onPress: () => setDrillHubTab('vault') },
        ]
      );
      return;
    }

    await applyImport(stepSet);
  }, [applyImport, stepSets, vault.isSubscribed]);

  const handleImportStepSetRef = useRef(handleImportStepSet);
  useEffect(() => {
    handleImportStepSetRef.current = handleImportStepSet;
  }, [handleImportStepSet]);

  useEffect(() => {
    const importFromUrl = (url: string | null) => {
      if (!url) return;
      const imported = decodeSharedStepSet(url);
      if (!imported) return;
      handleImportStepSetRef.current(imported);
    };

    Linking.getInitialURL().then((url) => {
      if (!url || consumedShareUrls.has(url)) return;
      consumedShareUrls.add(url);
      importFromUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      consumedShareUrls.add(url);
      importFromUrl(url);
    });

    return () => subscription.remove();
  }, []);

  const handleSaveStepSet = useCallback(async (name: string) => {
    const steps = getStepsSnapshot();
    const stepSet = createStepSet(name, isDoubles, steps, {
      width: screenWidth,
      height: screenHeight,
    });
    await saveStepSet(stepSet);
  }, [getStepsSnapshot, isDoubles, saveStepSet, screenHeight, screenWidth]);

  const handleLoadStepSet = useCallback((stepSet: StepSet) => {
    loadNormalizedSteps(stepSet.steps, stepSet.isDoubles);
  }, [loadNormalizedSteps]);

  // Vault drills are authored in a fixed court frame; remap them onto the
  // measured lines rect so they land on the painted court of this device.
  const handleLoadVaultDrill = (drill: VaultDrill) => {
    loadNormalizedSteps(drillStepsForCourt(drill.steps, courtDimensions), drill.isDoubles);
  };

  return (
    <View style={styles.container} onLayout={onRootLayout}>
      {/* Full-bleed court */}
      <View style={StyleSheet.absoluteFill}>
        <CourtSvg width={screenWidth} height={screenHeight} linesRect={linesRect} />
      </View>

      {/* Trails + markers (coordinates are screen coordinates) */}
      {showPlayerTrails && playerPositions.team1.map((pos, index) => (
        ghostPositions?.team1[index] && (
          <PositionTrail
            key={`trail-team1-${index}`}
            currentPosition={pos}
            ghostPosition={ghostPositions.team1[index]!}
            markerSize={customizations[index === 0 ? 'P1' : 'P2'].size}
          />
        )
      ))}
      {showPlayerTrails && playerPositions.team2.map((pos, index) => (
        ghostPositions?.team2[index] && (
          <PositionTrail
            key={`trail-team2-${index}`}
            currentPosition={pos}
            ghostPosition={ghostPositions.team2[index]!}
            markerSize={customizations[index === 0 ? 'P3' : 'P4'].size}
          />
        )
      ))}
      {showShuttleTrail && shuttlePosition && ghostPositions?.shuttle && (
        <PositionTrail
          currentPosition={shuttlePosition}
          ghostPosition={ghostPositions.shuttle}
          markerSize={customizations.Shuttle.size}
        />
      )}

      {playerPositions.team1.map((pos, index) => (
        <PlayerMarker
          key={`team1-${index}`}
          position={pos}
          color={customizations[index === 0 ? 'P1' : 'P2'].color}
          size={customizations[index === 0 ? 'P1' : 'P2'].size}
          isLeftHanded={customizations[index === 0 ? 'P1' : 'P2'].isLeftHanded}
          icon={customizations[index === 0 ? 'P1' : 'P2'].icon}
          iconType={customizations[index === 0 ? 'P1' : 'P2'].iconType}
          onPositionChange={(newPos) => updatePlayerPosition('team1', index, newPos)}
          onPositionStart={(newPos) => updatePlayerPosition('team1', index, newPos, true)}
          onPositionChangeComplete={handlePositionChangeComplete}
          onColorChange={(color) => updateMarkerCustomization(index === 0 ? 'P1' : 'P2', { color })}
          onSizeChange={(size) => updateMarkerCustomization(index === 0 ? 'P1' : 'P2', { size })}
          onIconChange={(icon) => updateMarkerCustomization(index === 0 ? 'P1' : 'P2', { icon })}
        />
      ))}
      {playerPositions.team2.map((pos, index) => (
        <PlayerMarker
          key={`team2-${index}`}
          position={pos}
          color={customizations[index === 0 ? 'P3' : 'P4'].color}
          size={customizations[index === 0 ? 'P3' : 'P4'].size}
          isLeftHanded={customizations[index === 0 ? 'P3' : 'P4'].isLeftHanded}
          icon={customizations[index === 0 ? 'P3' : 'P4'].icon}
          iconType={customizations[index === 0 ? 'P3' : 'P4'].iconType}
          onPositionChange={(newPos) => updatePlayerPosition('team2', index, newPos)}
          onPositionStart={(newPos) => updatePlayerPosition('team2', index, newPos, true)}
          onPositionChangeComplete={handlePositionChangeComplete}
          onColorChange={(color) => updateMarkerCustomization(index === 0 ? 'P3' : 'P4', { color })}
          onSizeChange={(size) => updateMarkerCustomization(index === 0 ? 'P3' : 'P4', { size })}
          onIconChange={(icon) => updateMarkerCustomization(index === 0 ? 'P3' : 'P4', { icon })}
        />
      ))}

      <PlayerMarker
        position={shuttlePosition}
        color={customizations.Shuttle.color}
        size={customizations.Shuttle.size}
        icon={customizations.Shuttle.icon}
        iconType={customizations.Shuttle.iconType}
        onPositionChange={updateShuttlePosition}
        onPositionStart={(newPos) => updateShuttlePosition(newPos, true)}
        onPositionChangeComplete={handlePositionChangeComplete}
        onColorChange={(color) => updateMarkerCustomization('Shuttle', { color })}
        onSizeChange={(size) => updateMarkerCustomization('Shuttle', { size })}
        onIconChange={(icon) => updateMarkerCustomization('Shuttle', { icon })}
      />

      {/* Floating header: mode pill + customize button */}
      <View style={[styles.header, { marginTop: headerTop }]} pointerEvents="box-none">
        <View style={styles.modePill}>
          <MaterialCommunityIcons name="badminton" size={18} color={palette.textPrimary} />
          <Text style={styles.modePillLabel}>
            {isDoubles ? 'Doubles' : 'Singles'} · Step {stepCount}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setDrillHubTab('vault')}
            hitSlop={8}
            style={({ pressed }) => [styles.headerAction, pressed && styles.glassPressed]}
          >
            <MaterialCommunityIcons name="treasure-chest" size={20} color={palette.accent} />
          </Pressable>
          <Pressable
            onPress={() => setIsMenuVisible(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.headerAction, pressed && styles.glassPressed]}
          >
            <MaterialCommunityIcons name="tune-variant" size={20} color={palette.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Court area spacer between header and dock — its measured rect hosts the lines */}
      <View style={styles.courtArea} pointerEvents="none" onLayout={onCourtAreaLayout} />

      {/* Floating bottom dock */}
      <View style={[styles.dock, { marginBottom: dockBottom }]}>
        <IconButton icon="restart" label="Reset" onPress={resetPositions} />
        <IconButton
          icon={isDoubles ? 'account-group' : 'account'}
          label={isDoubles ? 'Doubles' : 'Singles'}
          onPress={() => toggleGameMode(!isDoubles)}
        />
        <IconButton icon="undo-variant" label="Undo" onPress={undo} disabled={!canUndo} />
        <IconButton icon="redo-variant" label="Redo" onPress={redo} disabled={!canRedo} />
        <IconButton
          icon="shoe-print"
          label="Trails"
          onPress={togglePlayerTrails}
          active={showPlayerTrails}
        />
        <IconButton
          icon="badminton"
          label="Shuttle"
          onPress={toggleShuttleTrail}
          active={showShuttleTrail}
        />
        <IconButton
          icon="playlist-play"
          label="Drills"
          onPress={() => setDrillHubTab('mine')}
        />
      </View>

      <SettingsPanel
        isVisible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
      />

      <DrillHubPanel
        isVisible={drillHubTab !== null}
        initialTab={drillHubTab ?? 'mine'}
        onClose={() => setDrillHubTab(null)}
        vault={vault}
        stepSets={stepSets}
        currentStepCount={stepCount}
        onSave={handleSaveStepSet}
        onLoadStepSet={handleLoadStepSet}
        onDeleteStepSet={deleteStepSet}
        onImport={handleImportStepSet}
        onLoadDrill={handleLoadVaultDrill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: palette.bg,
  },
  header: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courtArea: {
    flex: 1,
  },
  modePill: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: palette.glassPill,
    borderWidth: 1,
    borderColor: palette.glassPillBorder,
    ...shadows.card,
  },
  modePillLabel: {
    ...sora('600'),
    fontSize: 13,
    color: palette.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAction: {
    width: HEADER_HEIGHT,
    height: HEADER_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: palette.glassPill,
    borderWidth: 1,
    borderColor: palette.glassPillBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  glassPressed: {
    backgroundColor: 'rgba(6, 26, 18, 0.62)',
  },
  dock: {
    marginHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DOCK_PADDING,
    backgroundColor: palette.glassPill,
    borderRadius: radii.dock,
    borderWidth: 1,
    borderColor: palette.glassPillBorder,
    ...shadows.floating,
  },
});
