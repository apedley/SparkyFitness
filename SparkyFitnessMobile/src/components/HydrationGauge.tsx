import React, { useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Canvas, Group, Path, Rect, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import Icon from './Icon';

interface HydrationGaugeProps {
  consumed: number; // ml
  goal: number;     // ml
  onIncrement?: () => void;
  onDecrement?: () => void;
  disableDecrement?: boolean;
}

const CANVAS_WIDTH = 70;
const CANVAS_HEIGHT = 130;

// Fillable region (bottom of lip to bottom of bottle)
const FILL_TOP = 28;
const FILL_BOTTOM = 124;
const FILL_HEIGHT = FILL_BOTTOM - FILL_TOP;

const HydrationGauge: React.FC<HydrationGaugeProps> = ({ consumed, goal, onIncrement, onDecrement, disableDecrement }) => {
  const hydrationColor = useCSSVariable('--color-hydration') as string;
  const trackColor = useCSSVariable('--color-progress-track') as string;
  const outlineColor = useCSSVariable('--color-text-tertiary') as string;

  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress]);

  const bottlePath = useMemo(() => {
    const p = Skia.Path.Make();

    // Neck
    p.moveTo(26, 6);
    p.lineTo(26, 23);

    // Lip (cap ridge)
    p.lineTo(23, 23);
    p.lineTo(23, 28);

    // Left shoulder curve
    p.cubicTo(23, 34, 12, 37, 12, 42);

    // Left body
    p.lineTo(12, 112);

    // Bottom curves
    p.cubicTo(12, 121, 20, 124, 35, 124);
    p.cubicTo(50, 124, 58, 121, 58, 112);

    // Right body
    p.lineTo(58, 42);

    // Right shoulder curve
    p.cubicTo(58, 37, 47, 34, 47, 28);

    // Lip right
    p.lineTo(47, 23);
    p.lineTo(44, 23);

    // Right neck
    p.lineTo(44, 6);

    p.close();
    return p;
  }, []);

  const fillPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const y = FILL_BOTTOM - FILL_HEIGHT * animatedProgress.value;
    p.addRect(Skia.XYWHRect(0, y, CANVAS_WIDTH, CANVAS_HEIGHT - y));
    return p;
  });

  const displayConsumed = Math.round(consumed);
  const displayGoal = Math.round(goal);
  // const percent = goal > 0 ? Math.round((consumed / goal) * 100) : 0;

  const showButtons = !!onIncrement || !!onDecrement;

  return (
    <View className="bg-section rounded-xl p-4 mt-2 shadow-sm">
      <View className="flex-row items-center">
        <View className="flex-row items-center mr-4">
          {showButtons && (
            <TouchableOpacity
              onPress={onDecrement}
              disabled={disableDecrement}
              style={disableDecrement ? { opacity: 0.3 } : undefined}
              className="p-2"
            >
              <Icon name="remove-circle" size={28} color={hydrationColor} />
            </TouchableOpacity>
          )}
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            {/* Fill clipped to bottle shape */}
            <Group clip={bottlePath}>
              <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} color={trackColor} />
              <Path path={fillPath} color={hydrationColor} />
            </Group>
            {/* Bottle outline */}
            <Path path={bottlePath} style="stroke" strokeWidth={2} color={outlineColor} />
          </Canvas>
          {showButtons && (
            <TouchableOpacity onPress={onIncrement} className="p-2">
              <Icon name="add-circle" size={28} color={hydrationColor} />
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-1 items-center mr-2">
          <Text className="text-2xl font-bold text-text-primary">
            {displayConsumed.toLocaleString()} ml
          </Text>
          <Text className="text-sm text-text-secondary mt-0.5">
            of {displayGoal.toLocaleString()} ml
          </Text>
        </View>
      </View>
    </View>
  );
};

export default HydrationGauge;
