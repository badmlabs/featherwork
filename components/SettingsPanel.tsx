import React, { useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated, Text, Image } from 'react-native';
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
  shadows,
  spacing,
} from '../constants/theme';

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

  const previewSize = Math.min(customization.size * 0.8, 45);

  return (
    <View style={styles.markerItemContainer}>
      <View style={styles.markerItemRow}>
        <TouchableOpacity
          onPress={() => markerId !== 'Shuttle' && setShowIconCustomization(true)}
          disabled={markerId === 'Shuttle'}
          style={styles.previewColumn}
        >
          <View
            style={[
              styles.markerPreview,
              {
                backgroundColor: customization.color,
                borderColor: markerRingColor(customization.color),
                width: previewSize,
                height: previewSize,
                borderRadius: previewSize / 2,
              }
            ]}
          >
            {customization.iconType === 'icon' && (
              <MaterialCommunityIcons
                name={customization.icon as any}
                size={previewSize * 0.6}
                color={markerContentColor(customization.color)}
              />
            )}
            {customization.iconType === 'text' && (
              <Text style={[
                styles.textIcon,
                {
                  fontSize: previewSize * 0.4,
                  color: markerContentColor(customization.color),
                }
              ]}>
                {customization.icon}
              </Text>
            )}
            {customization.iconType === 'photo' && (
              <Image
                source={{ uri: customization.icon }}
                style={[
                  styles.photoIcon,
                  {
                    width: previewSize * 0.8,
                    height: previewSize * 0.8,
                    borderRadius: previewSize * 0.4,
                  }
                ]}
              />
            )}
          </View>
          <Text style={styles.previewLabel}>{title}</Text>
        </TouchableOpacity>

        <View style={styles.colorSliderContainer}>
          <AppSlider
            minimumValue={0}
            maximumValue={360}
            value={currentHue}
            onValueChange={(value) => updateColor(Math.round(value))}
            thumbColor={customization.color}
            track={
              <LinearGradient
                colors={['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.colorGradient}
              />
            }
          />
        </View>

        <View style={styles.sizeSliderContainer}>
          <MaterialCommunityIcons name="resize" size={14} color={palette.textMuted} />
          <AppSlider
            style={styles.sizeSlider}
            minimumValue={20}
            maximumValue={80}
            value={customization.size}
            onValueChange={(value) => updateMarkerCustomization(markerId, { size: Math.round(value) })}
          />
        </View>
      </View>

      {markerId !== 'Shuttle' && (
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
}

interface SectionCardProps {
  label: string;
  children: React.ReactNode;
}

function SectionCard({ label, children }: SectionCardProps) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export function SettingsPanel({ isVisible, onClose }: SettingsPanelProps) {
  const { customizations, updateMarkerCustomization, resetCustomizations } = useMarkerCustomization();
  const scrollY = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  
  // Use a separate animated value for height to avoid conflicts
  const heightAnim = useRef(new Animated.Value(screenHeight * 0.5)).current;
  
  // Update height based on scroll with debouncing
  React.useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const newHeight = Math.max(
        screenHeight * 0.5,
        Math.min(screenHeight * 0.95, screenHeight * 0.5 + (value * 0.225))
      );
      heightAnim.setValue(newHeight);
    });
    
    return () => scrollY.removeListener(listener);
  }, [scrollY, heightAnim, screenHeight]);

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
        <Animated.View style={[
          styles.bottomSheet,
          {
            height: heightAnim,
          }
        ]}>
          <View style={styles.grabHandle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Customize</Text>
              <Text style={styles.headerSubtitle}>Marker colors, icons and sizes</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <Animated.ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={32}
            bounces={false}
            decelerationRate="normal"
          >
            <SectionCard label="Team 1">
              <MarkerItem
                markerId="P1"
                title="Player 1"
                customizations={customizations}
                updateMarkerCustomization={updateMarkerCustomization}
              />
              <View style={styles.rowDivider} />
              <MarkerItem
                markerId="P2"
                title="Player 2"
                customizations={customizations}
                updateMarkerCustomization={updateMarkerCustomization}
              />
            </SectionCard>

            <SectionCard label="Team 2">
              <MarkerItem
                markerId="P3"
                title="Player 3"
                customizations={customizations}
                updateMarkerCustomization={updateMarkerCustomization}
              />
              <View style={styles.rowDivider} />
              <MarkerItem
                markerId="P4"
                title="Player 4"
                customizations={customizations}
                updateMarkerCustomization={updateMarkerCustomization}
              />
            </SectionCard>

            <SectionCard label="Shuttle">
              <MarkerItem
                markerId="Shuttle"
                title="Shuttle"
                customizations={customizations}
                updateMarkerCustomization={updateMarkerCustomization}
              />
            </SectionCard>

            <TouchableOpacity style={styles.resetButton} onPress={resetCustomizations}>
              <MaterialCommunityIcons name="restore" size={18} color={palette.danger} />
              <Text style={styles.resetButtonText}>Reset all customizations</Text>
            </TouchableOpacity>
          </Animated.ScrollView>
        </Animated.View>
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
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.hairline,
    minHeight: 400,
    ...shadows.floating,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairlineStrong,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.textPrimary,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginHorizontal: spacing.lg,
  },
  markerItemContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  markerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewColumn: {
    alignItems: 'center',
    width: 58,
  },
  markerPreview: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
  colorSliderContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  colorGradient: {
    height: 10,
    borderRadius: 5,
  },
  sizeSliderContainer: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sizeSlider: {
    flex: 1,
    height: 30,
  },
  textIcon: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoIcon: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.35)',
    borderRadius: radii.pill,
    paddingVertical: 13,
    marginTop: spacing.xs,
  },
  resetButtonText: {
    color: palette.danger,
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
