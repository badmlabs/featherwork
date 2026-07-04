import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, sora } from '../constants/theme';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: number;
  label?: string;
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  active = false,
  size = 20,
  label,
}: IconButtonProps) {
  const iconColor = active ? palette.onAccent : 'rgba(255, 255, 255, 0.85)';

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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'transparent',
  },
  activeButton: {
    minWidth: 44,
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
});
