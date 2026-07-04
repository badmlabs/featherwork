#!/usr/bin/env bash
# Runs each Maestro CUF flow with adb screenrecord wrapped around it and
# pulls the mp4s into cuf-videos/. Called by the cuf-videos job in pr-apk.yml
# as a single line because android-emulator-runner executes `script:` input
# line-by-line under sh, which breaks multi-line loops.
set -u

adb install app-release.apk
mkdir -p cuf-videos
rc=0
for flow in .maestro/*.yaml; do
  name=$(basename "$flow" .yaml)
  adb shell "screenrecord --bit-rate 4000000 --time-limit 170 /sdcard/$name.mp4" &
  maestro test "$flow" || rc=1
  adb shell pkill -INT screenrecord || true
  sleep 3
  adb pull "/sdcard/$name.mp4" "cuf-videos/$name.mp4" || true
done
exit $rc
