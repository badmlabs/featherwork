import React, { useState, useEffect } from 'react';
import { Animated, Easing, StyleSheet, GestureResponderEvent, Text, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isMascot, LookId } from '../constants/customization';
import { MascotView, MASCOT_ASPECT } from './mascots';
import {
  markerContentColor,
  markerRingColor,
  sora,
} from '../constants/theme';

interface PlayerMarkerProps {
  position: { x: number; y: number };
  color: string;
  size?: number;
  /** Mascot looks mirror so the racket sits on the handedness' screen side. */
  isLeftHanded?: boolean;
  /** Near-court players (team 2) face away from the viewer; mascots show their back. */
  facingAway?: boolean;
  icon?: string;
  iconType?: 'icon' | 'text' | 'photo';
  /** Selected look; mascot looks render the full-body figure. */
  look?: LookId;
  /** Number shown on a mascot's chest chip ("1"…"4"). */
  label?: string;
  /** Ring/glyph overrides for shuttle styles; default derives from color. */
  ringColor?: string;
  contentColor?: string;
  /** Duration of the glide between steps (ms); user-tunable in Customize. */
  glideMs?: number;
  /** Playback: the piece ignores touches entirely. */
  locked?: boolean;
  /** Tutorial: lift this piece above the scrim so it reads as the live target. */
  elevated?: boolean;
  onPositionChange?: (newPosition: { x: number; y: number }) => void;
  onPositionStart?: (newPosition: { x: number; y: number }) => void;
  onPositionChangeComplete?: () => void;
  initialSize?: number;
}

export function PlayerMarker({
  position,
  color,
  size,
  isLeftHanded = false,
  facingAway = false,
  icon = 'account',
  iconType = 'icon',
  look = 'classic',
  label,
  ringColor,
  contentColor,
  glideMs = 260,
  locked = false,
  elevated = false,
  onPositionChange,
  onPositionStart,
  onPositionChangeComplete,
  initialSize = 30
}: PlayerMarkerProps) {
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  const [isLifted, setIsLifted] = useState(false);
  const markerSize = size ?? initialSize;
  const translate = React.useRef(new Animated.ValueXY({ x: position.x, y: position.y })).current;

  // While the finger is down the marker must track it 1:1; any other position
  // change (undo/redo/reset/drill load/pending discard) glides so the eye can
  // follow where each piece went.
  const { x: targetX, y: targetY } = position;
  useEffect(() => {
    if (isLifted) {
      translate.stopAnimation();
      translate.setValue({ x: targetX, y: targetY });
    } else {
      Animated.timing(translate, {
        toValue: { x: targetX, y: targetY },
        duration: glideMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [glideMs, isLifted, targetX, targetY, translate]);

  const mascot = isMascot(look) ? look : null;
  const glyphColor = contentColor ?? markerContentColor(color);

  // The touch/positioning box stays size x size for every look, so drill
  // coordinates, trails and 3D pins are look-agnostic; the taller mascot
  // figure is drawn centered on that box and overflows it visually.
  const mascotHeight = markerSize * MASCOT_ASPECT;

  return (
    <Animated.View
      style={[
        styles.marker,
        mascot
          ? styles.mascotBox
          : {
              backgroundColor: color,
              borderColor: ringColor ?? markerRingColor(color),
              borderWidth: 2.5,
              shadowOpacity: isLifted ? 0.6 : 0.35,
              shadowRadius: isLifted ? 10 : 5,
              elevation: isLifted ? 10 : 4,
            },
        {
          width: markerSize,
          height: markerSize,
          borderRadius: markerSize / 2,
          transform: [
            ...translate.getTranslateTransform(),
            { scale: isLifted ? 1.12 : 1 },
          ],
        },
        elevated && styles.elevated,
      ]}
      onStartShouldSetResponder={() => !locked}
      onMoveShouldSetResponder={() => !locked}
      onResponderGrant={(event: GestureResponderEvent) => {
        const touch = event.nativeEvent;
        setTouchOffset({
          x: touch.pageX - position.x,
          y: touch.pageY - position.y,
        });
        onPositionStart?.(position);
        setIsLifted(true);
      }}
      onResponderMove={(event: GestureResponderEvent) => {
        const touch = event.nativeEvent;
        onPositionChange?.({
          x: touch.pageX - touchOffset.x,
          y: touch.pageY - touchOffset.y,
        });
      }}
      onResponderRelease={() => {
        onPositionChangeComplete?.();
        setIsLifted(false);
      }}
    >
      {!mascot && (
        <>
          {iconType === 'icon' && (
            <MaterialCommunityIcons
              name={icon as any}
              size={markerSize * 0.48}
              color={glyphColor}
            />
          )}
          {iconType === 'text' && (
            <Text style={[
              styles.textIcon,
              {
                fontSize: markerSize * 0.4,
                color: glyphColor,
              }
            ]}>
              {icon}
            </Text>
          )}
          {iconType === 'photo' && (
            <Image
              source={{ uri: icon }}
              style={[
                styles.photoIcon,
                {
                  width: markerSize * 0.8,
                  height: markerSize * 0.8,
                  borderRadius: markerSize * 0.4,
                }
              ]}
            />
          )}
        </>
      )}
      {mascot != null && (
        // The taller figure is drawn centered on the round touch box.
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: (markerSize - mascotHeight) / 2,
            left: 0,
            width: markerSize,
            height: mascotHeight,
          }}
        >
          <MascotView
            mascot={mascot}
            band={color}
            label={label}
            width={markerSize}
            // Raw art holds the racket on the screen's right. Facing the viewer,
            // a right hand reads on the screen's left, so front views mirror for
            // right-handers; back views mirror for left-handers.
            flipped={facingAway ? isLeftHanded : !isLeftHanded}
            facingAway={facingAway}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  elevated: {
    zIndex: 40,
    elevation: 40,
  },
  marker: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotBox: {
    backgroundColor: 'transparent',
  },
  textIcon: {
    ...sora('700'),
    textAlign: 'center',
  },
  photoIcon: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
