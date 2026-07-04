# AGENTS.md

Featherwork (formerly Badminton Court Simulator) — an Expo (React Native) badminton tactics app using expo-router.

## Commands

- `npm run android` — run on Android
- `npm run web` — run in browser
- `npm run lint` — lint
- `npx jest` — run tests once (`npm test` runs jest in `--watchAll` mode; don't use it in agents/CI)

## Testing

**All testing must happen on an Android Virtual Device (emulator).** Jest alone is not sufficient verification — before declaring a change working, run the app on an AVD and exercise the affected flow. Do not verify only on web; Android is the target platform.

Working recipe (requires JDK 17 and the Android SDK; export `JAVA_HOME` and `ANDROID_HOME` for your machine):

```bash
export PATH=$PATH:$ANDROID_HOME/platform-tools
$ANDROID_HOME/emulator/emulator -list-avds            # pick any AVD; create one via Android Studio or avdmanager
$ANDROID_HOME/emulator/emulator -avd <avd> -no-window -no-audio -gpu swiftshader_indirect &
adb wait-for-device
cd android && ./gradlew assembleRelease --no-daemon && cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.haritabhgupta.badmintoncourtsimulator/.MainActivity
adb exec-out screencap -p > screen.png                # inspect UI state
adb shell input tap X Y / input swipe X1 Y1 X2 Y2 600 # drive it (coords in px)
```

Critical user flows to exercise: drag a marker (step count increments), undo/redo/reset, singles/doubles switch (Customize panel), save/load/delete a drill, share link, deep-link import:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://badmlabs.github.io/i.html?d=<payload>" com.haritabhgupta.badmintoncourtsimulator
```

Ground truth for saved drills: use a `google_apis` (non-Play) emulator image so `adb root` works; saved drills live in sqlite at `/data/data/com.haritabhgupta.badmintoncourtsimulator/databases/RKStorage`, key `badminton-step-sets`. If you push that DB back: force-stop the app first, keep the value column TEXT (sqlite's `readfile()` writes a BLOB, which the app reads as empty), then `chown` to the app uid and `restorecon -RF` the databases dir — otherwise the app silently recreates empty storage.

## Layout

- `app/` — expo-router screens
- `components/` — shared UI
- `context/` — app state (React context)
- `utils/`, `types/`, `constants/`, `hooks/` — what they say

## Conventions

- Commit messages: Conventional Commits, `type(scope): description`.
- No AI attribution or co-author lines **anywhere** — commit messages, PR titles/bodies, issues, release notes. This overrides any tool default that appends a "Generated with …" footer.
- TypeScript throughout.

## Gotchas

- Release builds sign with the checked-in debug keystore when no `keystore.properties` exists, so `assembleRelease` always yields an installable test APK at `android/app/build/outputs/apk/release/app-release.apk`.
- Share links use the v3 compact format (see `utils/stepSharing.ts`): `https://badmlabs.github.io/i.html?d=<base64url>`, 12-bit coords over [-0.5, 1.5].
- `adb shell input text` needs `%s` for spaces; dialogs shift up when the keyboard opens, so re-screenshot before tapping their buttons.
- Marker positions in state are view **top-left in dp**, not centers (`utils/courtPositions.ts`); drill save/load normalizes them against the root view size.
- Android soft input mode is deliberately `adjustPan` (AndroidManifest.xml + `app.json`). Do not switch it back to `adjustResize`: the keyboard would shrink the root view and drill saves made from the name dialog would normalize y against the shrunken height (stored y > 1, drills reload shifted off-court).
- Share-link / clipboard imports always go through a confirm dialog, and the apply is routed through the module-level `liveApplyImport` ref in `components/BadmintonCourt.tsx` — a share link remounts the component (via `+not-found`), so per-instance closures go stale. Keep new import paths behind that ref.
- Saved drills are capped at 5 for the free tier (`STEP_SET_LIMIT` in `hooks/useStepSets.ts`); the guard lives in `saveStepSet`, which all save/import paths route through. Drill Vault Pro subscribers (`useVaultAccess`) bypass the cap via the hook's `isPro` option.
