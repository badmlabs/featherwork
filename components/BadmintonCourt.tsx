import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Pressable, LayoutChangeEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from '../utils/appAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { PlayerMarker } from './PlayerMarker';
import { IconButton } from './IconButton';
import { CourtSvg } from './CourtSvg';
import { Court3DView, Step3D } from './Court3DView';
import { courtPointFromScreen } from '../utils/court3d';
import { useCourtPositions } from '../hooks/useCourtPositions';
import { STEP_SET_LIMIT, useStepSets } from '../hooks/useStepSets';
import { PositionTrail } from './PositionTrail';
import { SettingsPanel, ThemeTryOnBar } from './SettingsPanel';
import { DrillHubPanel, DrillHubTab } from './DrillHubPanel';
import { ProPaywall } from './ProPaywall';
import { drillStepsForCourt, VaultDrill } from '../data/vaultDrills';
import { useVaultAccess } from '../hooks/useVaultAccess';
import { useMarkerCustomization } from '../context/MarkerCustomizationContext';
import { courtThemeById, shuttleStyleById } from '../constants/customization';
import { createStepSet, decodeSharedStepSet } from '../utils/stepSharing';
import { maybeAskQuarterlyReview } from '../utils/reviewPrompt';
import { CourtTutorial, TutorialRing } from './TutorialOverlay';
import { NormalizedStep, StepSet } from '../types/drill';
import { palette, radii, shadows, sora, spacing } from '../constants/theme';

const HEADER_HEIGHT = 44;
// First-run tour: shown until completed or skipped once (also covers the
// upgrade that shipped it, since existing installs have no flag yet).
const TUTORIAL_SEEN_KEY = 'tutorial-v1-seen';
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

// Steps where more than one piece moved vs the previous step.
function countMultiPieceSteps(steps: NormalizedStep[]): number {
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
  const multi = countMultiPieceSteps(stepSet.steps);
  return {
    name: stepSet.name,
    chips: [
      `${stepSet.steps.length} steps`,
      stepSet.isDoubles ? 'Doubles' : 'Singles',
      ...(multi > 0
        ? [`${multi} multi-piece ${multi === 1 ? 'step' : 'steps'}`]
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
  // Stable identity: the 3D layer keys its projection and step memos off it.
  const { y: areaY, width: areaW, height: areaH } = area;
  const linesRect = useMemo(
    () => ({
      x: LINES_SIDE_INSET,
      y: areaY + LINES_GAP,
      width: areaW - LINES_SIDE_INSET * 2,
      height: areaH - LINES_GAP * 2,
    }),
    [areaY, areaW, areaH]
  );
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
  // Theme try-on: a locked court theme previews full-screen with an unlock bar.
  const [themeTryOn, setThemeTryOn] = useState(false);
  const [tryOnPaywall, setTryOnPaywall] = useState(false);
  const {
    customizations,
    previews,
    clearPreviews,
    commitPreviews,
    previewCourtTheme,
    effectiveLooks,
    effectiveShuttleStyle,
    effectiveCourtTheme,
  } = useMarkerCustomization();
  const courtTheme = courtThemeById(effectiveCourtTheme);
  const shuttleStyle = shuttleStyleById(effectiveShuttleStyle);
  const vault = useVaultAccess();

  // The try-on bar lives on a previewed theme; once that preview is committed
  // (purchase) or cleared, the bar has nothing to sell.
  useEffect(() => {
    if (themeTryOn && !previews.courtTheme) setThemeTryOn(false);
  }, [themeTryOn, previews.courtTheme]);
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
    hasPending,
    bankStep,
    isPlayback,
    exitPlayback,
    goToStart,
    toggleGameMode,
    resetPositions,
    clearSteps,
    undo,
    redo,
    goToStep,
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

  // ── Tilt-to-3D ─────────────────────────────────────────────────────────
  // `tilt` is the 2D↔3D blend b; toggling tweens it, and the 3D layer stays
  // mounted until it lands back on 0 so the court morphs instead of popping.
  const [is3D, setIs3D] = useState(false);
  const [isPlaying3D, setIsPlaying3D] = useState(false);
  const [tilt, setTilt] = useState(0);
  const tiltRef = useRef(0);
  const tiltRaf = useRef<number | null>(null);

  const animateTilt = useCallback((target: number) => {
    if (tiltRaf.current != null) cancelAnimationFrame(tiltRaf.current);
    const from = tiltRef.current;
    const t0 = performance.now();
    const DUR = 430;
    const frame = (now: number) => {
      let u = Math.min(1, (now - t0) / DUR);
      u = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const v = from + (target - from) * u;
      tiltRef.current = v;
      setTilt(v);
      if (u < 1) tiltRaf.current = requestAnimationFrame(frame);
    };
    tiltRaf.current = requestAnimationFrame(frame);
  }, []);

  useEffect(() => () => {
    if (tiltRaf.current != null) cancelAnimationFrame(tiltRaf.current);
  }, []);

  const setMode3D = (to3D: boolean) => {
    if (to3D === is3D) return;
    setIs3D(to3D);
    // Only one playback clock at a time: 3D flights vs the 2D step interval.
    if (to3D) setIsPlaying(false);
    else setIsPlaying3D(false);
    animateTilt(to3D ? 1 : 0);
  };

  const show3D = is3D || tilt > 0.001;

  // ── First-run tutorial ─────────────────────────────────────────────────
  // null = off; 0-5 = the six pages; 6 = the done page inside Customize.
  // Pages advance on the real control's tap, so the state machine is just
  // "which control is live" + a few advance hooks below.
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const inTutorial = tutorialStep !== null;

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_SEEN_KEY)
      .then((seen) => {
        if (!seen) setTutorialStep(0);
      })
      .catch(() => {});
  }, []);

  const finishTutorial = useCallback(() => {
    AsyncStorage.setItem(TUTORIAL_SEEN_KEY, '1').catch(() => {});
    setTutorialStep(null);
  }, []);

  const replayTutorial = () => {
    setIsMenuVisible(false);
    setDrillHubTab(null);
    setMode3D(false);
    // a loaded drill locks the pieces; page 1 needs Player 1 draggable
    setIsPlaying(false);
    setLoadedDrill(null);
    exitPlayback();
    setTutorialStep(0);
  };

  // Which piece may be dragged on the current page (0: only Player 1 — the
  // page teaches the drag; 1: all — "move a few pieces").
  const tutorialLocksPiece = (team: 'team1' | 'team2' | 'shuttle', index = 0) => {
    if (!inTutorial) return false;
    if (tutorialStep === 0) return !(team === 'team1' && index === 0);
    return tutorialStep !== 1;
  };
  const tutorialAllows = (target: 'next' | 'drills' | 'customize') =>
    !inTutorial ||
    (target === 'next' && tutorialStep === 1) ||
    (target === 'drills' && tutorialStep === 2) ||
    (target === 'customize' && tutorialStep === 5);

  // Current history rendered as court-unit pins (positions are view top-left).
  const steps3d: Step3D[] = useMemo(() => {
    const teamIds: ('P1' | 'P2' | 'P3' | 'P4')[][] = isDoubles
      ? [['P1', 'P2'], ['P3', 'P4']]
      : [['P1'], ['P3']];
    const pin = (pos: { x: number; y: number }, id: 'P1' | 'P2' | 'P3' | 'P4') => {
      const c = customizations[id];
      return {
        ...courtPointFromScreen(pos.x + c.size / 2, pos.y + c.size / 2, linesRect),
        color: c.color,
        size: c.size,
      };
    };
    const shuttleHalf = customizations.Shuttle.size / 2;
    return getStepsSnapshot().map((step) => ({
      players: [
        ...step.players.team1.map((pos, i) => pin(pos, teamIds[0][i])),
        ...step.players.team2.map((pos, i) => pin(pos, teamIds[1][i])),
      ],
      shuttle: courtPointFromScreen(
        step.shuttle.x + shuttleHalf,
        step.shuttle.y + shuttleHalf,
        linesRect
      ),
    }));
  }, [customizations, getStepsSnapshot, isDoubles, linesRect]);

  const advance3D = useCallback(() => {
    if (canRedo) redo();
    else goToStep(0); // loop the rally like the prototype
  }, [canRedo, redo, goToStep]);

  const step3DIndex = stepCount - 1;
  const back3D = () => goToStep(step3DIndex === 0 ? totalSteps - 1 : step3DIndex - 1);
  const next3D = () => goToStep((step3DIndex + 1) % totalSteps);

  // A freshly loaded/reset board can drop below 2 steps mid-playback.
  useEffect(() => {
    if (totalSteps < 2 && isPlaying3D) setIsPlaying3D(false);
  }, [totalSteps, isPlaying3D]);

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

  // Tutorial page 1 completes when Player 1's drop leaves a pending move.
  const onPieceDropped = useCallback(() => {
    handlePositionChangeComplete();
    if (tutorialStep === 0 && hasPending) setTutorialStep(1);
  }, [handlePositionChangeComplete, hasPending, tutorialStep]);

  // Page 2: Next banks the pending step.
  const handleBankStep = useCallback(() => {
    bankStep();
    if (tutorialStep === 1) setTutorialStep(2);
  }, [bankStep, tutorialStep]);

  // Page 5 ends with the saved drill auto-running; once the run reaches its
  // last step, hand the court back (silent Fork) so the finale starts from a
  // normal editing state.
  useEffect(() => {
    if (tutorialStep !== 5 || !isPlayback || !isPlaying || canRedo) return;
    const t = setTimeout(() => {
      setIsPlaying(false);
      setLoadedDrill(null);
      exitPlayback();
    }, 700);
    return () => clearTimeout(t);
  }, [tutorialStep, isPlayback, isPlaying, canRedo, exitPlayback]);

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
    if (inTutorial) finishTutorial(); // a share import mid-tour would deadlock it
    const saved = replaceId
      ? await replaceStepSet(replaceId, stepSet)
      : await importStepSet(stepSet);
    if (!saved) return; // drill limit reached; the hook already alerted
    beginPlayback(saved.steps, saved.isDoubles, stepSetMeta(saved));
    appAlert('Imported', `"${saved.name}" has been imported and loaded.`);
  }, [beginPlayback, finishTutorial, importStepSet, inTutorial, replaceStepSet]);

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

  useEffect(() => {
    maybeAskQuarterlyReview();
  }, []);

  const handleSaveStepSet = useCallback(async (name: string) => {
    const steps = getStepsSnapshot();
    const stepSet = createStepSet(name, isDoubles, steps, {
      width: screenWidth,
      height: screenHeight,
    });
    const saved = (await saveStepSet(stepSet)) !== null;
    if (saved && tutorialStep === 3) setTutorialStep(4);
    return saved;
  }, [getStepsSnapshot, isDoubles, saveStepSet, screenHeight, screenWidth, tutorialStep]);

  const handleLoadStepSet = useCallback((stepSet: StepSet) => {
    beginPlayback(stepSet.steps, stepSet.isDoubles, stepSetMeta(stepSet));
    if (tutorialStep === 4) {
      // page 6's payoff: watch the drill run, then the tour points at Customize
      loopHoldRef.current = 0;
      setIsPlaying(true);
      setTutorialStep(5);
    }
  }, [beginPlayback, tutorialStep]);

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
      {!show3D && (
        <View style={StyleSheet.absoluteFill}>
          <CourtSvg
            width={screenWidth}
            height={screenHeight}
            linesRect={linesRect}
            theme={courtTheme}
          />
        </View>
      )}

      {/* Tilted world: replaces the flat court and markers while tilt > 0 */}
      {show3D && (
        <Court3DView
          width={screenWidth}
          height={screenHeight}
          linesRect={linesRect}
          b={tilt}
          steps={steps3d}
          playing={isPlaying3D}
          onAdvance={advance3D}
          showPlayerTrails={showPlayerTrails}
          showShuttleTrail={showShuttleTrail}
          shuttleSize={customizations.Shuttle.size}
          hintBottom={dockBottom + estimatedDockHeight + 12}
          theme={courtTheme}
        />
      )}

      {/* Trails + markers (coordinates are screen coordinates) */}
      {!show3D && showPlayerTrails && playerPositions.team1.map((pos, index) => (
        ghostPositions?.team1[index] && (
          <PositionTrail
            key={`trail-team1-${index}`}
            currentPosition={pos}
            ghostPosition={ghostPositions.team1[index]!}
            markerSize={customizations[index === 0 ? 'P1' : 'P2'].size}
            elevated={tutorialStep === 1}
          />
        )
      ))}
      {!show3D && showPlayerTrails && playerPositions.team2.map((pos, index) => (
        ghostPositions?.team2[index] && (
          <PositionTrail
            key={`trail-team2-${index}`}
            currentPosition={pos}
            ghostPosition={ghostPositions.team2[index]!}
            markerSize={customizations[index === 0 ? 'P3' : 'P4'].size}
            elevated={tutorialStep === 1}
          />
        )
      ))}
      {/* Trail shuttle styles (Smash Trail / Night Glow) always paint their
          comet; otherwise the standard trail follows the Shuttle toggle. */}
      {!show3D && shuttlePosition && ghostPositions?.shuttle && (shuttleStyle.trail ? (
        <PositionTrail
          currentPosition={shuttlePosition}
          ghostPosition={ghostPositions.shuttle}
          markerSize={customizations.Shuttle.size}
          tint={shuttleStyle.trail}
        />
      ) : showShuttleTrail ? (
        <PositionTrail
          currentPosition={shuttlePosition}
          ghostPosition={ghostPositions.shuttle}
          markerSize={customizations.Shuttle.size}
          elevated={tutorialStep === 1}
        />
      ) : null)}

      {!show3D && playerPositions.team1.map((pos, index) => {
        const id = index === 0 ? 'P1' : 'P2';
        return (
          <PlayerMarker
            key={`team1-${index}`}
            position={pos}
            color={customizations[id].color}
            size={customizations[id].size}
            isLeftHanded={customizations[id].isLeftHanded}
            icon={customizations[id].icon}
            iconType={customizations[id].iconType}
            look={effectiveLooks[id]}
            label={id.slice(1)}
            glideMs={stepAnimationMs}
            locked={isPlayback || tutorialLocksPiece('team1', index)}
            elevated={(tutorialStep === 0 && index === 0) || tutorialStep === 1}
            onPositionChange={(newPos) => updatePlayerPosition('team1', index, newPos)}
            onPositionStart={(newPos) => updatePlayerPosition('team1', index, newPos, true)}
            onPositionChangeComplete={onPieceDropped}
          />
        );
      })}
      {!show3D && playerPositions.team2.map((pos, index) => {
        const id = index === 0 ? 'P3' : 'P4';
        return (
          <PlayerMarker
            key={`team2-${index}`}
            position={pos}
            color={customizations[id].color}
            size={customizations[id].size}
            isLeftHanded={customizations[id].isLeftHanded}
            facingAway
            icon={customizations[id].icon}
            iconType={customizations[id].iconType}
            look={effectiveLooks[id]}
            label={id.slice(1)}
            glideMs={stepAnimationMs}
            locked={isPlayback || tutorialLocksPiece('team2', index)}
            elevated={tutorialStep === 1}
            onPositionChange={(newPos) => updatePlayerPosition('team2', index, newPos)}
            onPositionStart={(newPos) => updatePlayerPosition('team2', index, newPos, true)}
            onPositionChangeComplete={onPieceDropped}
          />
        );
      })}

      {!show3D && (
        <PlayerMarker
          position={shuttlePosition}
          color={shuttleStyle.bg}
          ringColor={shuttleStyle.ring}
          contentColor={shuttleStyle.glyph}
          size={customizations.Shuttle.size}
          icon="badminton"
          iconType="icon"
          glideMs={stepAnimationMs}
          locked={isPlayback || tutorialLocksPiece('shuttle')}
          elevated={tutorialStep === 1}
          onPositionChange={updateShuttlePosition}
          onPositionStart={(newPos) => updateShuttlePosition(newPos, true)}
          onPositionChangeComplete={onPieceDropped}
        />
      )}

      {/* Floating header: mode/drill pill + 2D/3D switch + customize button
          (stays Settings in playback too; the banner ✕ is the only dismiss
          control) */}
      <View
        style={[styles.header, { marginTop: headerTop }, tutorialStep === 5 && styles.liftedChrome]}
        pointerEvents="box-none"
      >
        {isPlayback && loadedDrill ? (
          <Pressable
            style={[styles.namePill, inTutorial && styles.tutorialDimmed]}
            disabled={inTutorial}
            onPress={() => setInfoOpen((open) => !open)}
          >
            <MaterialCommunityIcons name="playlist-play" size={17} color={palette.textPrimary} />
            <Text style={styles.namePillLabel} numberOfLines={1}>
              {loadedDrill.name}
            </Text>
            <MaterialCommunityIcons
              name={infoOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={palette.textSecondary}
            />
            <Text
              style={[styles.namePillCount, (isPlaying || isPlaying3D) && { color: palette.accent }]}
            >
              {stepCount}/{totalSteps}
            </Text>
            <View style={styles.namePillTrack}>
              <View
                style={[styles.namePillFill, { width: `${(stepCount / totalSteps) * 100}%` }]}
              />
            </View>
          </Pressable>
        ) : (
          <View style={[styles.modePill, inTutorial && tutorialStep !== 2 && styles.tutorialDimmed]}>
            <MaterialCommunityIcons name="badminton" size={18} color={palette.textPrimary} />
            <Text style={styles.modePillLabel} numberOfLines={1}>
              {isDoubles ? 'Doubles' : 'Singles'} · Step {stepCount}
              {is3D ? `/${totalSteps}` : ''}
            </Text>
          </View>
        )}
        <View style={styles.headerActions}>
          <View style={[styles.modeSegment, inTutorial && styles.tutorialDimmed]}>
            <Pressable
              disabled={inTutorial}
              onPress={() => setMode3D(false)}
              style={[styles.segmentBtn, !is3D && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, !is3D && styles.segmentTextActive]}>2D</Text>
            </Pressable>
            <Pressable
              disabled={inTutorial}
              onPress={() => setMode3D(true)}
              style={[styles.segmentBtn, is3D && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, is3D && styles.segmentTextActive]}>3D</Text>
            </Pressable>
          </View>
          <Pressable
            disabled={inTutorial}
            onPress={() => setDrillHubTab('vault')}
            hitSlop={8}
            accessibilityLabel="Drill Vault"
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.glassPressed,
              inTutorial && styles.tutorialDimmed,
            ]}
          >
            <MaterialCommunityIcons name="treasure-chest" size={20} color={palette.accent} />
            {vault.isSubscribed && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </Pressable>
          <View>
            <Pressable
              disabled={!tutorialAllows('customize')}
              onPress={() => {
                if (tutorialStep === 5) {
                  // reaching the finale counts as seen even if the app dies here
                  AsyncStorage.setItem(TUTORIAL_SEEN_KEY, '1').catch(() => {});
                  setTutorialStep(6);
                }
                setIsMenuVisible(true);
              }}
              hitSlop={8}
              accessibilityLabel="Customize"
              style={({ pressed }) => [styles.headerAction, pressed && styles.glassPressed]}
            >
              <MaterialCommunityIcons name="tune-variant" size={20} color={palette.textPrimary} />
            </Pressable>
            {tutorialStep === 5 && <TutorialRing inset={-7} />}
          </View>
        </View>
      </View>

      {/* Playback lock banner (✕ dismisses just the banner; 2D only — in 3D
          nothing is draggable anyway) */}
      {!show3D && isPlayback && !lockBannerDismissed && !infoOpen && (
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
              <Text style={styles.lockBannerAccent}>Fork</Text> exits playback at any stage so
              you can edit from that step
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
          <Text style={styles.infoCardBody}>
            <Text style={styles.lockBannerAccent}>Fork</Text> exits drill playback at any stage
            and unlocks the pieces for editing.
          </Text>
          <View style={styles.chipRow}>
            {loadedDrill.chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Court area spacer between header and dock — its measured rect hosts the lines */}
      <View style={styles.courtArea} pointerEvents="none" onLayout={onCourtAreaLayout} />

      {/* Floating bottom dock: edit controls in 2D, playback controls in 3D */}
      <View
        style={[
          styles.dock,
          { marginBottom: dockBottom },
          (tutorialStep === 1 || tutorialStep === 2) && styles.liftedChrome,
        ]}
      >
        {is3D ? (
          <>
            <IconButton
              icon="skip-previous"
              label="Back"
              onPress={back3D}
              disabled={totalSteps < 2}
            />
            <IconButton
              icon={isPlaying3D ? 'pause' : 'play'}
              label={isPlaying3D ? 'Pause' : 'Play'}
              onPress={() => setIsPlaying3D((prev) => !prev)}
              active
              disabled={totalSteps < 2}
            />
            <IconButton
              icon="skip-next"
              label="Next"
              onPress={next3D}
              disabled={totalSteps < 2}
            />
          </>
        ) : isPlayback ? (
          <>
            <IconButton icon="source-fork" label="Fork" onPress={handleFork} disabled={inTutorial} />
            <IconButton
              icon="step-backward"
              label="Back"
              onPress={stepBack}
              disabled={!canUndo || inTutorial}
            />
            <IconButton
              icon="step-forward"
              label="Next"
              onPress={stepNext}
              disabled={!canRedo || inTutorial}
            />
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              label={isPlaying ? 'Pause' : 'Play'}
              onPress={togglePlay}
              active
              disabled={inTutorial}
            />
          </>
        ) : (
          <>
            {totalSteps > 1 ? (
              // Wipe the stack but keep positions — for staging a start formation.
              <IconButton icon="broom" label="Clear" onPress={clearSteps} disabled={inTutorial} />
            ) : (
              <IconButton icon="restart" label="Reset" onPress={resetPositions} disabled={inTutorial} />
            )}
            <IconButton
              icon="undo-variant"
              label="Undo"
              onPress={undo}
              disabled={!canUndo || inTutorial}
            />
            {hasPending ? (
              // Redo's slot moonlights: moved pieces are a pending step until
              // Next banks them as one.
              <View>
                <IconButton
                  icon="arrow-right"
                  label="Next"
                  onPress={handleBankStep}
                  active
                  disabled={!tutorialAllows('next')}
                />
                {tutorialStep === 1 && <TutorialRing inset={-6} radius={18} rotate="-2.5deg" />}
              </View>
            ) : (
              <IconButton
                icon="redo-variant"
                label="Redo"
                onPress={redo}
                disabled={!canRedo || inTutorial}
              />
            )}
          </>
        )}
        <IconButton
          icon="shoe-print"
          label="Trails"
          onPress={togglePlayerTrails}
          active={showPlayerTrails}
          disabled={inTutorial}
        />
        <IconButton
          icon="badminton"
          label="Shuttle"
          onPress={toggleShuttleTrail}
          active={showShuttleTrail}
          disabled={inTutorial}
        />
        <View>
          <IconButton
            icon="playlist-play"
            label="Drills"
            onPress={() => {
              if (tutorialStep === 2) setTutorialStep(3);
              setDrillHubTab('mine');
            }}
            disabled={!tutorialAllows('drills')}
          />
          {tutorialStep === 2 && <TutorialRing inset={-7} radius={18} rotate="-2deg" />}
        </View>
      </View>

      {/* Theme try-on: dots + unlock bar over the live court */}
      {themeTryOn && (
        <ThemeTryOnBar
          bottom={dockBottom + estimatedDockHeight + 14}
          isSubscribed={vault.isSubscribed}
          onUnlock={() => setTryOnPaywall(true)}
          onClose={() => {
            previewCourtTheme(null);
            setThemeTryOn(false);
          }}
        />
      )}

      {inTutorial && tutorialStep! <= 5 && !show3D && (
        <CourtTutorial
          step={tutorialStep!}
          screenW={screenWidth}
          headerTop={headerTop}
          dockTop={area.y + area.height}
          linesRect={linesRect}
          p1={{
            x: playerPositions.team1[0]?.x ?? 0,
            y: playerPositions.team1[0]?.y ?? 0,
            size: customizations.P1.size,
          }}
          onSkip={finishTutorial}
        />
      )}

      <SettingsPanel
        isVisible={isMenuVisible}
        onClose={() => {
          setIsMenuVisible(false);
          // Closing the sheet ends every try-before-you-buy preview.
          clearPreviews();
          if (tutorialStep === 6) finishTutorial();
        }}
        isDoubles={isDoubles}
        onGameModeChange={toggleGameMode}
        stepAnimationMs={stepAnimationMs}
        onStepAnimationChange={setStepAnimationMs}
        vault={vault}
        onStartThemeTryOn={() => {
          setIsMenuVisible(false);
          clearPreviews({ keepCourtTheme: true });
          setThemeTryOn(true);
        }}
        tutorialDone={tutorialStep === 6}
        onReplayTutorial={replayTutorial}
      />

      <ProPaywall
        visible={tryOnPaywall}
        onClose={() => setTryOnPaywall(false)}
        vault={vault}
        onSubscribed={commitPreviews}
      />

      <DrillHubPanel
        isVisible={drillHubTab !== null}
        initialTab={drillHubTab ?? 'mine'}
        onClose={() => setDrillHubTab(null)}
        tutorialStep={tutorialStep}
        onSkipTutorial={finishTutorial}
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
    flexShrink: 1,
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
  modeSegment: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    borderRadius: radii.pill,
    backgroundColor: palette.glassPill,
    borderWidth: 1,
    borderColor: palette.glassPillBorder,
    overflow: 'hidden',
    ...shadows.card,
  },
  segmentBtn: {
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: palette.accent,
  },
  segmentText: {
    ...sora('700'),
    fontSize: 11,
    color: palette.textSecondary,
  },
  segmentTextActive: {
    color: palette.onAccent,
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
  // Tutorial: pop this chrome above the scrim (z30) so it reads as live.
  liftedChrome: {
    zIndex: 40,
    elevation: 40,
  },
  // Tutorial: siblings of the live control fade like the rest of the page.
  tutorialDimmed: {
    opacity: 0.35,
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
    // Shrinks below its content (name truncates) so the 2D/3D switch and the
    // header icons never get pushed off-screen; RN flexShrink defaults to 0.
    flexShrink: 1,
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
