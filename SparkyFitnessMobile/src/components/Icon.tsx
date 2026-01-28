import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

/**
 * Icon mapping from semantic names to platform-specific icons.
 * - sf: SF Symbol name (iOS)
 * - ion: Ionicon name (Android)
 */
const ICON_MAP = {
  // Navigation
  'chevron-down': { sf: 'chevron.down', ion: 'chevron-down' },
  'chevron-forward': { sf: 'chevron.right', ion: 'chevron-forward' },
  'chevron-back': { sf: 'chevron.left', ion: 'chevron-back' },

  // Actions
  'copy': { sf: 'doc.on.doc', ion: 'copy-outline' },
  'paste': { sf: 'doc.on.clipboard', ion: 'clipboard-outline' },
  'add-circle': { sf: 'plus.circle', ion: 'add-circle-outline' },
  'remove-circle': { sf: 'minus.circle', ion: 'remove-circle-outline' },
  'checkmark': { sf: 'checkmark', ion: 'checkmark' },
  'settings': { sf: 'gearshape', ion: 'settings-outline' },

  // Status
  'shield-checkmark': { sf: 'checkmark.shield', ion: 'shield-checkmark-outline' },
  'cloud-offline': { sf: 'icloud.slash', ion: 'cloud-offline-outline' },
  'alert-circle': { sf: 'exclamationmark.circle', ion: 'alert-circle-outline' },
  'globe': { sf: 'globe', ion: 'globe-outline' },

  // Meals
  'meal-breakfast': { sf: 'sunrise.fill', ion: 'sunny' },
  'meal-lunch': { sf: 'sun.max.fill', ion: 'partly-sunny' },
  'meal-dinner': { sf: 'moon.stars.fill', ion: 'moon' },
  'meal-snack': { sf: 'clock.fill', ion: 'time' },

  // Exercise
  'exercise': { sf: 'flame.fill', ion: 'flame' },

  // Charts/Data
  'chart-bar': { sf: 'chart.bar.fill', ion: 'bar-chart' },
  'sync': { sf: 'arrow.triangle.2.circlepath', ion: 'sync' },
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolViewProps['weight'];
}

/**
 * Cross-platform icon component.
 * Uses SF Symbols on iOS and Ionicons on Android.
 */
const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000000',
  style,
  weight = 'regular',
}) => {
  const mapping = ICON_MAP[name];

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={mapping.sf}
        size={size}
        tintColor={color}
        style={style}
        weight={weight}
      />
    );
  }

  return (
    <Ionicons
      name={mapping.ion as keyof typeof Ionicons.glyphMap}
      size={size}
      color={color}
      style={style}
    />
  );
};

export default Icon;
