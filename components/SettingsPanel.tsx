import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, Image, ScrollView } from 'react-native';
import { appAlert } from '../utils/appAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { AppSlider } from './AppSlider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMarkerCustomization, MarkerId, IconType } from '../context/MarkerCustomizationContext';
import { IconCustomizationModal } from './IconCustomizationModal';
import {
  markerContentColor,
  markerRingColor,
  palette,
  radii,
  sora,
  spacing,
} from '../constants/theme';

// Hue slider ramp from the design spec
const HUE_RAMP = [
  '#FF4D4D', '#FFC94D', '#8CFF4D', '#4DFFC1', '#4D9BFF', '#A64DFF', '#FF4D4D',
] as const;

// Reusable component for player/shuttle items
interface MarkerItemProps {
  markerId: MarkerId;
  title: string;
  customizations: any;
  updateMarkerCustomization: (markerId: MarkerId, customization: any) => void;
}

function MarkerItem({ markerId, title, customizations, updateMarkerCustomization }: MarkerItemProps) {
  const customization = customizations[markerId];
  const [showIconCustomization, setShowIconCustomization] = useState(false);

  // Convert current color to hue value (0-360)
  const getHueFromColor = (color: string) => {
    // Handle white and black specially
    if (color === '#ffffff') return 0; // White - keep at red position but maintain white
    if (color === '#000000') return 0; // Black - keep at red position but maintain black

    // Convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    // Convert RGB to HSL
    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255;
      g /= 255;
      b /= 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return { h: h * 360, s, l };
    };

    const rgb = hexToRgb(color);
    if (!rgb) return 0;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.h;
  };

  const currentHue = getHueFromColor(customization.color);

  const updateColor = (hue: number) => {
    // Convert hue to hex color with full saturation and medium lightness
    const hueToHex = (h: number) => {
      const normalizedHue = h % 360;

      // Special handling for white/black - if we're at hue 0 and the current color is white/black, maintain it
      if (normalizedHue === 0) {
        const currentColor = customizations[markerId].color;
        if (currentColor === '#ffffff' || currentColor === '#000000') {
          return currentColor; // Keep the current white/black color
        }
      }

      const saturation = 1; // Full saturation for vibrant colors
      const lightness = 0.5; // Medium lightness for solid colors

      // Convert HSL to RGB
      const hueToRgb = (h: number, s: number, l: number) => {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r, g, b;
        if (h < 60) {
          [r, g, b] = [c, x, 0];
        } else if (h < 120) {
          [r, g, b] = [x, c, 0];
        } else if (h < 180) {
          [r, g, b] = [0, c, x];
        } else if (h < 240) {
          [r, g, b] = [0, x, c];
        } else if (h < 300) {
          [r, g, b] = [x, 0, c];
        } else {
          [r, g, b] = [c, 0, x];
        }

        const toHex = (n: number) => {
          const hex = Math.round((n + m) * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      };

      return hueToRgb(normalizedHue, saturation, lightness);
    };

    updateMarkerCustomization(markerId, { color: hueToHex(hue) });
  };

  const isShuttle = markerId === 'Shuttle';

  return (
    <View style={styles.rowCard}>
      <TouchableOpacity
        onPress={() => !isShuttle && setShowIconCustomization(true)}
        disabled={isShuttle}
        style={styles.avatarWrap}
      >
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: customization.color,
              borderColor: markerRingColor(customization.color),
            },
          ]}
        >
          {customization.iconType === 'icon' && (
            <MaterialCommunityIcons
              name={customization.icon as any}
              size={19}
              color={markerContentColor(customization.color)}
            />
          )}
          {customization.iconType === 'text' && (
            <Text
              style={[styles.avatarText, { color: markerContentColor(customization.color) }]}
              numberOfLines={1}
            >
              {customization.icon}
            </Text>
          )}
          {customization.iconType === 'photo' && (
            <Image source={{ uri: customization.icon }} style={styles.avatarPhoto} />
          )}
        </View>
        {!isShuttle && (
          <View style={styles.editBadge}>
            <MaterialCommunityIcons name="pencil" size={9} color={palette.onAccent} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <View style={styles.sliderRow}>
          <View style={styles.hueSlider}>
            <AppSlider
              minimumValue={0}
              maximumValue={360}
              value={currentHue}
              onValueChange={(value) => updateColor(Math.round(value))}
              thumbColor={customization.color}
              thumbSize={18}
              track={
                <LinearGradient
                  colors={HUE_RAMP}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.hueTrack}
                />
              }
            />
          </View>
          <MaterialCommunityIcons name="resize" size={14} color={palette.textMuted} />
          <View style={styles.sizeSlider}>
            <AppSlider
              minimumValue={20}
              maximumValue={80}
              value={customization.size}
              onValueChange={(value) => updateMarkerCustomization(markerId, { size: Math.round(value) })}
              trackColor="rgba(255, 255, 255, 0.16)"
              trackHeight={5}
              filledColor="rgba(255, 201, 77, 0.55)"
              thumbColor={palette.accent}
              thumbSize={16}
            />
          </View>
        </View>
      </View>

      {!isShuttle && (
        <IconCustomizationModal
          visible={showIconCustomization}
          onClose={() => setShowIconCustomization(false)}
          onSave={(type: IconType, value: string) => {
            updateMarkerCustomization(markerId, {
              icon: value,
              iconType: type
            });
          }}
          currentValue={customization.icon}
          currentType={customization.iconType}
          markerId={markerId}
          currentColor={customization.color}
        />
      )}
    </View>
  );
}

interface SettingsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  isDoubles: boolean;
  onGameModeChange: (isDoubles: boolean) => void;
}

export function SettingsPanel({ isVisible, onClose, isDoubles, onGameModeChange }: SettingsPanelProps) {
  const { customizations, updateMarkerCustomization, resetCustomizations } = useMarkerCustomization();

  // Switching mode reseeds the court, so ignore taps on the already-active option.
  const selectMode = (doubles: boolean) => {
    if (doubles !== isDoubles) onGameModeChange(doubles);
  };

  const confirmReset = () => {
    appAlert(
      'Reset all customizations',
      'Restore default colors, sizes and icons for every marker?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetCustomizations },
      ]
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.bottomSheet}>
          <View style={styles.grabHandle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Customize</Text>
              <Text style={styles.headerSubtitle}>Game mode, marker colors, icons and sizes</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={18} color={palette.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Game mode</Text>
            <View style={styles.modeCard}>
              <TouchableOpacity
                style={[styles.modeOption, !isDoubles && styles.modeOptionActive]}
                onPress={() => selectMode(false)}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={15}
                  color={!isDoubles ? palette.onAccent : palette.textSecondary}
                />
                <Text style={[styles.modeOptionText, !isDoubles && styles.modeOptionTextActive]}>
                  Singles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeOption, isDoubles && styles.modeOptionActive]}
                onPress={() => selectMode(true)}
              >
                <MaterialCommunityIcons
                  name="account-multiple"
                  size={15}
                  color={isDoubles ? palette.onAccent : palette.textSecondary}
                />
                <Text style={[styles.modeOptionText, isDoubles && styles.modeOptionTextActive]}>
                  Doubles
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Team 1</Text>
            <MarkerItem
              markerId="P1"
              title="Player 1"
              customizations={customizations}
              updateMarkerCustomization={updateMarkerCustomization}
            />
            <MarkerItem
              markerId="P2"
              title="Player 2"
              customizations={customizations}
              updateMarkerCustomization={updateMarkerCustomization}
            />

            <Text style={styles.sectionLabel}>Team 2</Text>
            <MarkerItem
              markerId="P3"
              title="Player 3"
              customizations={customizations}
              updateMarkerCustomization={updateMarkerCustomization}
            />
            <MarkerItem
              markerId="P4"
              title="Player 4"
              customizations={customizations}
              updateMarkerCustomization={updateMarkerCustomization}
            />

            <Text style={styles.sectionLabel}>Shuttle</Text>
            <MarkerItem
              markerId="Shuttle"
              title="Shuttle"
              customizations={customizations}
              updateMarkerCustomization={updateMarkerCustomization}
            />

            <TouchableOpacity style={styles.resetButton} onPress={confirmReset}>
              <MaterialCommunityIcons name="restore" size={17} color={palette.danger} />
              <Text style={styles.resetButtonText}>Reset all customizations</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.overlay,
  },
  bottomSheet: {
    height: '63%',
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: palette.surfaceBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.55,
    shadowRadius: 25,
    elevation: 16,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4.5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    ...sora('600'),
    fontSize: 19,
    color: palette.textPrimary,
  },
  headerSubtitle: {
    ...sora('400'),
    fontSize: 11.5,
    color: palette.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...sora('700'),
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: palette.textMuted,
    marginTop: spacing.md,
    marginBottom: 7,
  },
  modeCard: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: radii.md,
    padding: 5,
    marginBottom: 6,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: radii.sm,
  },
  modeOptionActive: {
    backgroundColor: palette.accent,
  },
  modeOptionText: {
    ...sora('600'),
    fontSize: 13,
    color: palette.textSecondary,
  },
  modeOptionTextActive: {
    ...sora('700'),
    color: palette.onAccent,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 6,
  },
  avatarWrap: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    ...sora('700'),
    fontSize: 13,
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.accent,
    borderWidth: 2,
    borderColor: '#0F241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    ...sora('600'),
    fontSize: 13,
    color: palette.textPrimary,
    marginBottom: 2,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hueSlider: {
    flex: 1.5,
  },
  hueTrack: {
    height: 8,
    borderRadius: radii.pill,
  },
  sizeSlider: {
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    backgroundColor: palette.dangerSoft,
    borderWidth: 1,
    borderColor: palette.dangerBorder,
    borderRadius: 14,
    marginTop: spacing.md,
  },
  resetButtonText: {
    ...sora('600'),
    color: palette.danger,
    fontSize: 14,
  },
});
