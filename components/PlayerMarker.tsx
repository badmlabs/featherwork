import React, { useState, useEffect } from 'react';
import { View, StyleSheet, GestureResponderEvent, Modal, TouchableOpacity, Text, Dimensions, Image } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppSlider } from './AppSlider';
import {
  markerColors,
  markerContentColor,
  markerRingColor,
  palette,
  radii,
  shadows,
  spacing,
} from '../constants/theme';

interface PlayerMarkerProps {
  position: { x: number; y: number };
  color: string;
  size?: number;
  isLeftHanded?: boolean;
  icon?: string;
  iconType?: 'icon' | 'text' | 'photo';
  onPositionChange?: (newPosition: { x: number; y: number }) => void;
  onPositionStart?: (newPosition: { x: number; y: number }) => void;
  onPositionChangeComplete?: () => void;
  onColorChange?: (color: string) => void;
  onSizeChange?: (size: number) => void;
  onIconChange?: (icon: string) => void;
  initialSize?: number;
}

const availableIcons = [
  'account', 'account-circle', 'account-group', 'badminton', 'run',
  'run-fast', 'walk', 'human-handsup', 'karate', 'soccer',
  'basketball', 'volleyball', 'tennis', 'star', 'heart'
];

export function PlayerMarker({ 
  position, 
  color, 
  size,
  isLeftHanded,
  icon = 'account',
  iconType = 'icon',
  onPositionChange, 
  onPositionStart, 
  onPositionChangeComplete,
  onColorChange,
  onSizeChange,
  onIconChange,
  initialSize = 30
}: PlayerMarkerProps) {
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  const [isLifted, setIsLifted] = useState(false);
  const [showCustomizationMenu, setShowCustomizationMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [markerSize, setMarkerSize] = useState(size || initialSize);

  // Update internal markerSize when size prop changes
  useEffect(() => {
    if (size !== undefined) {
      setMarkerSize(size);
    }
  }, [size]);

  const getAdjustedMenuPosition = (touchX: number, touchY: number) => {
    const screen = Dimensions.get('window');
    const menuWidth = 300;
    const menuHeight = 400;
    const margin = 10;

    let x = touchX - menuWidth / 2;
    let y = touchY - 50;

    if (x + menuWidth > screen.width - margin) {
      x = screen.width - menuWidth - margin;
    }
    if (x < margin) {
      x = margin;
    }

    if (y + menuHeight > screen.height - margin) {
      y = touchY - menuHeight;
    }
    if (y < margin) {
      y = touchY + 20;
    }

    return { x, y };
  };

  const contentColor = markerContentColor(color);

  return (
    <>
      <View
        style={[
          styles.marker,
          {
            backgroundColor: color,
            borderColor: markerRingColor(color),
            width: markerSize,
            height: markerSize,
            borderRadius: markerSize / 2,
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { scale: isLifted ? 1.12 : 1 },
            ],
            shadowOpacity: isLifted ? 0.6 : 0.35,
            shadowRadius: isLifted ? 10 : 5,
            elevation: isLifted ? 10 : 4,
            opacity: 1,
          },
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event: GestureResponderEvent) => {
          const touch = event.nativeEvent;
          setTouchOffset({
            x: touch.pageX - position.x,
            y: touch.pageY - position.y,
          });
          
          longPressTimeout.current = setTimeout(() => {
            const adjustedPosition = getAdjustedMenuPosition(touch.pageX, touch.pageY);
            setMenuPosition(adjustedPosition);
            setShowCustomizationMenu(true);
          }, 500);

          onPositionStart?.(position);
          setIsLifted(true);
        }}
        onResponderMove={(event: GestureResponderEvent) => {
          // Clear long press timeout if movement starts
          if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
          }
          
          const touch = event.nativeEvent;
          const newPosition = {
            x: touch.pageX - touchOffset.x,
            y: touch.pageY - touchOffset.y,
          };
          onPositionChange?.(newPosition);
        }}
        onResponderRelease={() => {
          if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
          }
          onPositionChangeComplete?.();
          setIsLifted(false);
        }}
      >
        {iconType === 'icon' && (
          <MaterialCommunityIcons
            name={icon as any}
            size={markerSize * 0.6}
            color={contentColor}
          />
        )}
        {iconType === 'text' && (
          <Text style={[
            styles.textIcon,
            {
              fontSize: markerSize * 0.4,
              color: contentColor,
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
      </View>

      <Modal
        visible={showCustomizationMenu}
        transparent={true}
        onRequestClose={() => setShowCustomizationMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCustomizationMenu(false)}
        >
          <View
            style={[
              styles.customizationMenu,
              {
                top: menuPosition.y,
                left: menuPosition.x,
              }
            ]}
          >
            <PaperText variant="titleMedium" style={styles.menuTitle}>
              Customize marker
            </PaperText>
            
            <View style={styles.section}>
              <PaperText variant="bodyMedium" style={styles.sectionTitle}>
                Color
              </PaperText>
              <View style={styles.colorGrid}>
                {markerColors.map((colorOption) => (
                  <TouchableOpacity
                    key={colorOption.value}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorOption.value },
                      color === colorOption.value && styles.selectedColorOption,
                    ]}
                    onPress={() => {
                      onColorChange?.(colorOption.value);
                    }}
                  >
                    {color === colorOption.value && (
                      <MaterialCommunityIcons 
                        name="check" 
                        size={16} 
                        color={markerContentColor(colorOption.value)} 
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <PaperText variant="bodyMedium" style={styles.sectionTitle}>
                Icon
              </PaperText>
              <View style={styles.iconGrid}>
                {availableIcons.map((iconOption) => (
                  <TouchableOpacity
                    key={iconOption}
                    style={[
                      styles.iconOption,
                      icon === iconOption && styles.selectedIconOption
                    ]}
                    onPress={() => {
                      onIconChange?.(iconOption);
                    }}
                  >
                    <MaterialCommunityIcons 
                      name={iconOption as any} 
                      size={22} 
                      color={icon === iconOption ? palette.accent : palette.textSecondary} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.section}>
              <PaperText variant="bodyMedium" style={styles.sectionTitle}>
                Size
              </PaperText>
              <AppSlider
                style={styles.slider}
                minimumValue={20}
                maximumValue={60}
                value={markerSize}
                onValueChange={(value: number) => {
                  setMarkerSize(value);
                  onSizeChange?.(value);
                }}
              />
              <PaperText variant="bodySmall" style={styles.sizeValue}>
                {Math.round(markerSize)}px
              </PaperText>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCustomizationMenu(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.overlay,
  },
  customizationMenu: {
    position: 'absolute',
    backgroundColor: palette.surfaceRaised,
    padding: spacing.lg,
    borderRadius: radii.lg,
    width: 300,
    maxHeight: 420,
    borderWidth: 1,
    borderColor: palette.hairline,
    ...shadows.floating,
  },
  menuTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontWeight: '600',
    color: palette.textSecondary,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  colorOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderColor: palette.textPrimary,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.hairline,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.surfaceSunken,
  },
  selectedIconOption: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sizeValue: {
    textAlign: 'center',
    marginTop: spacing.xs,
    color: palette.textSecondary,
  },
  closeButton: {
    marginTop: spacing.xs,
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: palette.onAccent,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  textIcon: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoIcon: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
