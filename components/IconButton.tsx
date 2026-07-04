import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, sora } from '../constants/theme';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: number;
  label?: string;
  /** Tint for the icon when not active (e.g. palette.danger for Cancel). */
  color?: string;
  /** Small count bubble at the top-right corner; hidden when 0/undefined. */
  badge?: number;
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  active = false,
  size = 20,
  label,
  color,
  badge,
}: IconButtonProps) {
  const iconColor = active ? palette.onAccent : color ?? 'rgba(255, 255, 255, 0.85)';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        active && styles.activeButton,
        pressed && !disabled && !active && styles.pressedButton,
        disabled && styles.disabledButton,
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={size} color={iconColor} />
      {label ? (
        <Text style={[styles.label, active && styles.activeLabel]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 46,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'transparent',
  },
  activeButton: {
    minWidth: 50,
    backgroundColor: palette.accent,
  },
  pressedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  disabledButton: {
    opacity: 0.4,
  },
  label: {
    ...sora('600'),
    fontSize: 9,
    letterSpacing: 0.2,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  activeLabel: {
    ...sora('700'),
    color: palette.onAccent,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: palette.onAccent,
    borderWidth: 1.5,
    borderColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...sora('700'),
    fontSize: 10,
    color: palette.accent,
  },
});
