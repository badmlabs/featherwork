import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radii } from '../constants/theme';

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
  size = 22,
  label,
}: IconButtonProps) {
  const iconColor = active
    ? palette.onAccent
    : disabled
      ? palette.textMuted
      : palette.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        active && styles.activeButton,
        pressed && !disabled && styles.pressedButton,
        disabled && styles.disabledButton,
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={size} color={iconColor} />
      {label ? (
        <Text
          style={[
            styles.label,
            active && styles.activeLabel,
            disabled && styles.disabledLabel,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    height: 52,
    paddingHorizontal: 4,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'transparent',
  },
  activeButton: {
    backgroundColor: palette.accent,
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  pressedButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  disabledButton: {
    opacity: 0.45,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: palette.textSecondary,
  },
  activeLabel: {
    color: palette.onAccent,
  },
  disabledLabel: {
    color: palette.textMuted,
  },
});
