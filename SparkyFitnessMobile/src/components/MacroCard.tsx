import React, { useState, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Canvas, Rect, Path, Group, Skia, rect, rrect } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useCSSVariable } from 'uniwind';

interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  overfillColor: string;
  unit?: string;
}

const BAR_HEIGHT = 8;
const BORDER_RADIUS = 4;
const emptyPath = Skia.Path.Make();

const MacroCard: React.FC<MacroCardProps> = ({ label, consumed, goal, color, overfillColor, unit = 'g' }) => {
  const [barWidth, setBarWidth] = useState(0);
  const progress = goal > 0 ? consumed / goal : 0;
  const trackColor = useCSSVariable('--color-progress-track') as string;

  const animatedProgress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      animatedProgress.value = 0;
      animatedProgress.value = withTiming(progress, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }, [progress]) // animatedProgress is a stable ref from useSharedValue
  );

  const clipRect = useMemo(
    () => barWidth > 0 ? rrect(rect(0, 0, barWidth, BAR_HEIGHT), BORDER_RADIUS, BORDER_RADIUS) : null,
    [barWidth]
  );

  const canvasStyle = useMemo(() => ({ width: barWidth, height: BAR_HEIGHT }), [barWidth]);

  const fillPath = useDerivedValue(() => {
    const p = animatedProgress.value;
    if (p <= 0 || barWidth <= 0) return emptyPath;
    const w = p > 1 ? barWidth / p : barWidth * p;
    const path = Skia.Path.Make();
    path.addRect(Skia.XYWHRect(0, 0, w, BAR_HEIGHT));
    return path;
  }, [barWidth]);

  const overflowPath = useDerivedValue(() => {
    const p = animatedProgress.value;
    if (p <= 1 || barWidth <= 0) return emptyPath;
    const solidW = barWidth / p;
    const gapStart = solidW + 2;
    const w = barWidth - gapStart;
    if (w <= 0) return emptyPath;
    const path = Skia.Path.Make();
    path.addRect(Skia.XYWHRect(gapStart, 0, w, BAR_HEIGHT));
    return path;
  }, [barWidth]);

  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View className="w-[48%] bg-section rounded-xl p-3 mb-3 shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-text-primary">{label}</Text>
        <Text className="text-xs text-text-secondary">
          {Math.round(consumed)}{unit} / {Math.round(goal)}{unit}
        </Text>
      </View>
      {/* Progress bar container */}
      <View className="h-2" onLayout={onLayout}>
        {barWidth > 0 && clipRect && (
          <Canvas style={canvasStyle}>
            {/* Clip entire bar for rounded corners */}
            <Group clip={clipRect}>
              {/* Track background */}
              <Rect
                x={0}
                y={0}
                width={barWidth}
                height={BAR_HEIGHT}
                color={trackColor}
              />
              {/* Animated fill portion */}
              <Path path={fillPath} color={color} />
              {/* Overflow portion with reduced opacity */}
              <Group opacity={0.65}>
                <Path path={overflowPath} color={color} />
              </Group>
            </Group>
          </Canvas>
        )}
      </View>
    </View>
  );
};

export default React.memo(MacroCard);
