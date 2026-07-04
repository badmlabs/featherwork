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
import { STEP_SET_LIMIT, useStepSets } from '../hooks/useStepSets';
import { PositionTrail } from './PositionTrail';
import { SettingsPanel } from './SettingsPanel';
import { DrillHubPanel, DrillHubTab } from './DrillHubPanel';
import { drillStepsForCourt, VaultDrill } from '../data/vaultDrills';
import { useVaultAccess } from '../hooks/useVaultAccess';
import { useMarkerCustomization } from '../context/MarkerCustomizationContext';
import { createStepSet, decodeSharedStepSet } from '../utils/stepSharing';
import { NormalizedStep, StepSet } from '../types/drill';
import { palette, radii, shadows, sora, spacing } from '../constants/theme';

const HEADER_HEIGHT = 44;
const DOCK_PADDING = 10;
const LINES_SIDE_INSET = 30;
const LINES_GAP = 16;

// Module-level so remounts (e.g. via the +not-found redirect) never
// re-import a URL that was already handled in this app session.
const consumedShareUrls = new Set<string>();

// A share link remounts this component (via +not-found) right after the URL
// event fires, so the import dialog — which survives in the root-level
// AppAlertHost — must apply through whichever instance is mounted when the
// user answers, not through the closure that showed it.
const liveApplyImport: {
  current: ((stepSet: StepSet, replaceId?: string) => void) | null;
} = { current: null };

// Steps where more than one piece moved vs the previous step (Together steps).
function countTogetherSteps(steps: NormalizedStep[]): number {
  let count = 0;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const step = steps[i];
    let moved = 0;
    (['team1', 'team2'] as const).forEach((team) =>
      step.players[team].forEach((pos, j) => {
        const was = prev.players[team][j];
        if (was && (was.x !== pos.x || was.y !== pos.y)) moved++;
      })
    );
    if (step.shuttle.x !== prev.shuttle.x || step.shuttle.y !== prev.shuttle.y) moved++;
    if (moved > 1) count++;
  }
  return count;
}

interface LoadedDrillMeta {
  name: string;
  description?: string;
  chips: string[];
}

const stepSetMeta = (stepSet: StepSet): LoadedDrillMeta => {
  const together = countTogetherSteps(stepSet.steps);
  return {
    name: stepSet.name,
    chips: [
      `${stepSet.steps.length} steps`,
      stepSet.isDoubles ? 'Doubles' : 'Singles',
      ...(together > 0
        ? [`${together} together ${together === 1 ? 'step' : 'steps'}`]
        : []),
      `Saved ${new Date(stepSet.createdAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })}`,
    ],
  };
};

const vaultMeta = (drill: VaultDrill, steps: NormalizedStep[]): LoadedDrillMeta => ({
  name: drill.name,
  description: drill.description,
  chips: [
    `${steps.length} steps`,
    drill.isDoubles ? 'Doubles' : 'Singles',
    drill.category,
    drill.difficulty,
  ],
});

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
  // Glide duration between steps (ms); set from the Customize panel slider.
  const [stepAnimationMs, setStepAnimationMs] = useState(260);
  // Playback state for the loaded drill.
  const [loadedDrill, setLoadedDrill] = useState<LoadedDrillMeta | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [lockBannerDismissed, setLockBannerDismissed] = useState(false);
  const { customizations, updateMarkerCustomization } = useMarkerCustomization();
  const vault = useVaultAccess();
  const { stepSets, saveStepSet, deleteStepSet, replaceStepSet, importStepSet } = useStepSets({
    isPro: vault.isSubscribed,
    onLimitReached: () =>
      appAlert(
        'Saved drills are full',
        `Free keeps ${STEP_SET_LIMIT} saved drills. Drill Vault Pro removes the limit.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Pro', onPress: () => setDrillHubTab('vault') },
        ]
      ),
  });

  const {
    isDoubles,
    playerPositions,
    shuttlePosition,
    ghostPositions,
    updatePlayerPosition,
    updateShuttlePosition,
    handlePositionChangeComplete,
    isTogether,
    toggleTogether,
    cancelTogether,
    togetherMoved,
    isPlayback,
    exitPlayback,
    goToStart,
    toggleGameMode,
    resetPositions,
    clearSteps,
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
    totalSteps,
  } = useCourtPositions(courtDimensions);

  const togetherCount = togetherMoved
    ? [...togetherMoved.team1, ...togetherMoved.team2, togetherMoved.shuttle].filter(Boolean).length
    : 0;

  // Once the real court area is measured, re-seed the default positions —
  // but only while the board is pristine (nothing moved, no history).
  const measuredKey = courtArea
    ? `${Math.round(courtArea.y)}:${Math.round(courtArea.width)}:${Math.round(courtArea.height)}`
    : '';
  useEffect(() => {
    if (measuredKey && !canUndo && !canRedo && !isPlayback) {
      resetPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredKey]);

  // Autoplay: one step per tick, paced by the step-speed setting. At the last
  // step, hold ~3 beats, then loop from the start.
  const loopHoldRef = useRef(0);
  useEffect(() => {
    if (!isPlaying || !isPlayback) return;
    const id = setInterval(() => {
      if (canRedo) {
        loopHoldRef.current = 0;
        redo();
      } else if (++loopHoldRef.current >= 3) {
        loopHoldRef.current = 0;
        goToStart();
      }
    }, stepAnimationMs + 700);
    return () => clearInterval(id);
  }, [canRedo, goToStart, isPlayback, isPlaying, redo, stepAnimationMs]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (!canRedo) goToStart(); // at the end: replay from the top
    loopHoldRef.current = 0;
    setIsPlaying(true);
  }, [canRedo, goToStart, isPlaying]);

  const stepBack = useCallback(() => {
    setIsPlaying(false);
    undo();
  }, [undo]);

  const stepNext = useCallback(() => {
    setIsPlaying(false);
    redo();
  }, [redo]);

  // Fork: unlock the loaded drill for editing at the current step.
  const handleFork = useCallback(() => {
    setIsPlaying(false);
    setInfoOpen(false);
    setLoadedDrill(null);
    exitPlayback();
  }, [exitPlayback]);

  const beginPlayback = useCallback((
    steps: NormalizedStep[],
    nextIsDoubles: boolean,
    meta: LoadedDrillMeta
  ) => {
    loadNormalizedSteps(steps, nextIsDoubles);
    setLoadedDrill(meta);
    setIsPlaying(false);
    setInfoOpen(false);
    setLockBannerDismissed(false);
  }, [loadNormalizedSteps]);

  const applyImport = useCallback(async (stepSet: StepSet, replaceId?: string) => {
    const saved = replaceId
      ? await replaceStepSet(replaceId, stepSet)
      : await importStepSet(stepSet);
    if (!saved) return; // drill limit reached; the hook already alerted
    beginPlayback(saved.steps, saved.isDoubles, stepSetMeta(saved));
    appAlert('Imported', `"${saved.name}" has been imported and loaded.`);
  }, [beginPlayback, importStepSet, replaceStepSet]);

  useEffect(() => {
    liveApplyImport.current = applyImport;
  }, [applyImport]);

  const handleImportStepSet = useCallback(async (stepSet: StepSet) => {
    const existing = stepSets.find((item) => item.name === stepSet.name);

    appAlert(
      existing ? 'Drill already exists' : 'Import drill',
      existing
        ? `A drill named "${stepSet.name}" is already saved. Replace it?`
        : `Import "${stepSet.name}" and load it onto the court?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: existing ? 'Replace' : 'Import',
          style: existing ? 'destructive' : 'default',
          onPress: () => liveApplyImport.current?.(stepSet, existing?.id),
        },
      ]
    );
  }, [stepSets]);

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
    return (await saveStepSet(stepSet)) !== null;
  }, [getStepsSnapshot, isDoubles, saveStepSet, screenHeight, screenWidth]);

  const handleLoadStepSet = useCallback((stepSet: StepSet) => {
    beginPlayback(stepSet.steps, stepSet.isDoubles, stepSetMeta(stepSet));
  }, [beginPlayback]);

  // Vault drills are authored in a fixed court frame; remap them onto the
  // measured lines rect so they land on the painted court of this device.
  const handleLoadVaultDrill = (drill: VaultDrill) => {
    const steps = drillStepsForCourt(drill.steps, courtDimensions);
    beginPlayback(steps, drill.isDoubles, vaultMeta(drill, steps));
  };

  // Saving a vault drill makes it a personal copy in My Drills: it goes
  // through the same cap rules as any save and outlives the subscription.
  const handleSaveVaultDrill = async (drill: VaultDrill) => {
    const stepSet: StepSet = {
      id: `vault-${drill.id}-${Date.now()}`,
      name: drill.name,
      isDoubles: drill.isDoubles,
      steps: drillStepsForCourt(drill.steps, courtDimensions),
      createdAt: Date.now(),
    };
    return (await saveStepSet(stepSet)) !== null;
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
          linked={!!togetherMoved?.team1[index]}
          glideMs={stepAnimationMs}
          locked={isPlayback}
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
          linked={!!togetherMoved?.team2[index]}
          glideMs={stepAnimationMs}
          locked={isPlayback}
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
        linked={!!togetherMoved?.shuttle}
        glideMs={stepAnimationMs}
        locked={isPlayback}
        onPositionChange={updateShuttlePosition}
        onPositionStart={(newPos) => updateShuttlePosition(newPos, true)}
        onPositionChangeComplete={handlePositionChangeComplete}
        onColorChange={(color) => updateMarkerCustomization('Shuttle', { color })}
        onSizeChange={(size) => updateMarkerCustomization('Shuttle', { size })}
        onIconChange={(icon) => updateMarkerCustomization('Shuttle', { icon })}
      />

      {/* Floating header: mode/drill pill + customize button (stays Settings
          in playback too; the banner ✕ is the only dismiss control) */}
      <View style={[styles.header, { marginTop: headerTop }]} pointerEvents="box-none">
        {isPlayback && loadedDrill ? (
          <Pressable style={styles.namePill} onPress={() => setInfoOpen((open) => !open)}>
            <MaterialCommunityIcons name="playlist-play" size={17} color={palette.textPrimary} />
            <Text style={styles.namePillLabel} numberOfLines={1}>
              {loadedDrill.name}
            </Text>
            <MaterialCommunityIcons
              name={infoOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={palette.textSecondary}
            />
            <Text style={[styles.namePillCount, isPlaying && { color: palette.accent }]}>
              {stepCount}/{totalSteps}
            </Text>
            <View style={styles.namePillTrack}>
              <View
                style={[styles.namePillFill, { width: `${(stepCount / totalSteps) * 100}%` }]}
              />
            </View>
          </Pressable>
        ) : (
          <View style={styles.modePill}>
            <MaterialCommunityIcons name="badminton" size={18} color={palette.textPrimary} />
            <Text style={styles.modePillLabel}>
              {isDoubles ? 'Doubles' : 'Singles'} · Step {stepCount}
            </Text>
          </View>
        )}
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setDrillHubTab('vault')}
            hitSlop={8}
            accessibilityLabel="Drill Vault"
            style={({ pressed }) => [styles.headerAction, pressed && styles.glassPressed]}
          >
            <MaterialCommunityIcons name="treasure-chest" size={20} color={palette.accent} />
            {vault.isSubscribed && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setIsMenuVisible(true)}
            hitSlop={8}
            accessibilityLabel="Customize"
            style={({ pressed }) => [styles.headerAction, pressed && styles.glassPressed]}
          >
            <MaterialCommunityIcons name="tune-variant" size={20} color={palette.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Playback lock banner (✕ dismisses just the banner) */}
      {isPlayback && !lockBannerDismissed && !infoOpen && (
        <View
          style={[styles.lockBanner, { top: headerTop + HEADER_HEIGHT + spacing.md }]}
          pointerEvents="box-none"
        >
          <MaterialCommunityIcons name="lock-outline" size={17} color={palette.textPrimary} />
          <View style={styles.bannerText}>
            <Text style={styles.lockBannerTitle}>Drill loaded — pieces are locked</Text>
            <Text style={styles.lockBannerBody}>
              Walk the steps with Back / Next, or press Play
            </Text>
            <Text style={styles.lockBannerBody}>
              <Text style={styles.lockBannerAccent}>Fork</Text> copies the drill so you can edit
              from this step
            </Text>
          </View>
          <Pressable
            onPress={() => setLockBannerDismissed(true)}
            hitSlop={8}
            style={styles.bannerClose}
          >
            <MaterialCommunityIcons name="close" size={13} color={palette.textPrimary} />
          </Pressable>
        </View>
      )}

      {/* Drill info card (tap the name pill to toggle) */}
      {isPlayback && infoOpen && loadedDrill && (
        <View
          style={[styles.infoCard, { top: headerTop + HEADER_HEIGHT + spacing.md }]}
          pointerEvents="box-none"
        >
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoCardTitle} numberOfLines={1}>
              {loadedDrill.name}
            </Text>
            <Text style={styles.infoCardHint}>tap name to close</Text>
          </View>
          {loadedDrill.description ? (
            <Text style={styles.infoCardBody}>{loadedDrill.description}</Text>
          ) : null}
          <View style={styles.chipRow}>
            {loadedDrill.chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Armed-Together banner (visual only; never blocks drags underneath) */}
      {isTogether && (
        <View
          style={[styles.togetherBanner, { top: headerTop + HEADER_HEIGHT + spacing.md }]}
          pointerEvents="none"
        >
          <MaterialCommunityIcons name="link-variant" size={17} color={palette.accent} />
          <View style={styles.togetherBannerText}>
            <Text style={styles.togetherBannerTitle}>Together is on — drag any pieces</Text>
            <Text style={styles.togetherBannerBody}>
              They&apos;ll move as one step · Together saves · Cancel discards
            </Text>
          </View>
        </View>
      )}

      {/* Court area spacer between header and dock — its measured rect hosts the lines */}
      <View style={styles.courtArea} pointerEvents="none" onLayout={onCourtAreaLayout} />

      {/* Floating bottom dock */}
      <View style={[styles.dock, { marginBottom: dockBottom }]}>
        {isPlayback ? (
          <>
            <IconButton icon="source-fork" label="Fork" onPress={handleFork} />
            <IconButton icon="step-backward" label="Back" onPress={stepBack} disabled={!canUndo} />
            <IconButton icon="step-forward" label="Next" onPress={stepNext} disabled={!canRedo} />
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              label={isPlaying ? 'Pause' : 'Play'}
              onPress={togglePlay}
              active
            />
          </>
        ) : (
          <>
            {isTogether ? (
              <IconButton
                icon="close-circle-outline"
                label="Cancel"
                color={palette.danger}
                onPress={cancelTogether}
              />
            ) : totalSteps > 1 ? (
              // Wipe the stack but keep positions — for staging a start formation.
              <IconButton icon="broom" label="Clear" onPress={clearSteps} />
            ) : (
              <IconButton icon="restart" label="Reset" onPress={resetPositions} />
            )}
            <IconButton icon="undo-variant" label="Undo" onPress={undo} disabled={!canUndo || isTogether} />
            <IconButton icon="redo-variant" label="Redo" onPress={redo} disabled={!canRedo || isTogether} />
            <IconButton
              icon="link-variant"
              label="Together"
              onPress={toggleTogether}
              active={isTogether}
              badge={togetherCount}
            />
          </>
        )}
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
        isDoubles={isDoubles}
        onGameModeChange={toggleGameMode}
        stepAnimationMs={stepAnimationMs}
        onStepAnimationChange={setStepAnimationMs}
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
        onSaveDrill={handleSaveVaultDrill}
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
  proBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
    ...shadows.card,
  },
  proBadgeText: {
    ...sora('700'),
    fontSize: 8,
    letterSpacing: 0.6,
    color: palette.onAccent,
  },
  // Drill name pill: like the mode pill, plus a step progress bar at the bottom.
  namePill: {
    height: HEADER_HEIGHT + 2,
    maxWidth: '78%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 13,
    paddingRight: 15,
    paddingBottom: 7,
    borderRadius: radii.pill,
    backgroundColor: palette.glassPill,
    borderWidth: 1,
    borderColor: palette.glassPillBorder,
    overflow: 'hidden',
    ...shadows.card,
  },
  namePillLabel: {
    ...sora('600'),
    fontSize: 13,
    color: palette.textPrimary,
    flexShrink: 1,
    maxWidth: 150,
  },
  namePillCount: {
    ...sora('600'),
    fontSize: 11,
    letterSpacing: 0.4,
    color: palette.textMuted,
  },
  namePillTrack: {
    position: 'absolute',
    left: 13,
    right: 13,
    bottom: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  namePillFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: palette.accent,
  },
  lockBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: 'rgba(6, 26, 18, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...shadows.card,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  lockBannerTitle: {
    ...sora('600'),
    fontSize: 12,
    color: palette.textPrimary,
  },
  lockBannerBody: {
    ...sora('400'),
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  lockBannerAccent: {
    ...sora('600'),
    color: palette.accent,
  },
  bannerClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 26, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...shadows.floating,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoCardTitle: {
    ...sora('700'),
    fontSize: 15,
    color: palette.textPrimary,
    flex: 1,
  },
  infoCardHint: {
    ...sora('400'),
    fontSize: 10,
    color: palette.textMuted,
  },
  infoCardBody: {
    ...sora('400'),
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  chipText: {
    ...sora('600'),
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Amber glass per the Together mockup (opacity bumped: no backdrop blur on RN).
  togetherBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: 'rgba(35, 22, 4, 0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 201, 77, 0.75)',
    ...shadows.card,
  },
  togetherBannerText: {
    flex: 1,
    gap: 2,
  },
  togetherBannerTitle: {
    ...sora('600'),
    fontSize: 12,
    color: '#FFE4A6',
  },
  togetherBannerBody: {
    ...sora('400'),
    fontSize: 10.5,
    color: 'rgba(255, 228, 166, 0.75)',
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
