import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PlayerPosition } from '../types/game';

interface PositionTrailProps {
  currentPosition: PlayerPosition;
  ghostPosition: PlayerPosition;
  color: string;
}

export function PositionTrail({ currentPosition, ghostPosition, color }: PositionTrailProps) {
  // Calculate the angle and length of the line
  const dx = currentPosition.x - ghostPosition.x;
  const dy = currentPosition.y - ghostPosition.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const length = Math.sqrt(dx * dx + dy * dy);

  // Create dots for the trail, fading toward the ghost (older) end
  const DOT_SIZE = 5;
  const DOT_SPACING = 12;
  const numberOfDots = Math.floor(length / DOT_SPACING);
  const dots = Array.from({ length: numberOfDots }, (_, i) => (
    <View
      key={i}
      style={[
        styles.dot,
        {
          left: ghostPosition.x + 10 + (i * DOT_SPACING * Math.cos(angle * Math.PI / 180)),
          top: ghostPosition.y + 10 + (i * DOT_SPACING * Math.sin(angle * Math.PI / 180)),
          backgroundColor: color,
          width: DOT_SIZE,
          height: DOT_SIZE,
          opacity: 0.25 + 0.6 * ((i + 1) / Math.max(numberOfDots, 1)),
        },
      ]}
    />
  ));

  return (
    <>
      {dots}
      <View
        style={[
          styles.ghostMarker,
          {
            left: ghostPosition.x,
            top: ghostPosition.y,
            borderColor: color,
            backgroundColor: 'transparent',
            opacity: 0.65,
          },
        ]}
      >
        <View style={[styles.ghostCore, { backgroundColor: color }]} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    borderRadius: 3,
  },
  ghostMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
});
