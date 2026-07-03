import React, { useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, View, ViewStyle } from 'react-native';
import { palette } from '../constants/theme';

interface AppSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange: (value: number) => void;
  style?: ViewStyle;
  /** Custom track background (e.g. a gradient). Defaults to a themed track. */
  track?: React.ReactNode;
  filledColor?: string;
  trackColor?: string;
  thumbColor?: string;
  thumbSize?: number;
}

/**
 * Minimal pan-based slider. Replaces the community slider package, whose web
 * implementation crashes on React 19 (findDOMNode) and whose thumb/track
 * cannot be themed consistently across platforms.
 */
export function AppSlider({
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  style,
  track,
  filledColor = palette.accent,
  trackColor = palette.hairlineStrong,
  thumbColor = palette.accent,
  thumbSize = 20,
}: AppSliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const range = maximumValue - minimumValue;
  const ratio = range === 0 ? 0 : Math.min(1, Math.max(0, (value - minimumValue) / range));

  const handleTouch = (event: GestureResponderEvent) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const x = event.nativeEvent.locationX;
    const nextRatio = Math.min(1, Math.max(0, x / w));
    onValueChange(minimumValue + nextRatio * range);
  };

  return (
    <View
      style={[styles.container, { height: Math.max(30, thumbSize + 8) }, style]}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <View style={styles.trackContainer} pointerEvents="none">
        {track ?? (
          <View style={[styles.defaultTrack, { backgroundColor: trackColor }]}>
            <View
              style={[
                styles.defaultFill,
                { backgroundColor: filledColor, width: `${ratio * 100}%` },
              ]}
            />
          </View>
        )}
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbColor,
            left: Math.max(0, ratio * Math.max(0, width - thumbSize)),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  trackContainer: {
    justifyContent: 'center',
  },
  defaultTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  defaultFill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
});
