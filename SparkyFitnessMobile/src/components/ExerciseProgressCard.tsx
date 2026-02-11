import React, { useState, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Canvas, Rect, Path, Group, Skia, rect, rrect } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useCSSVariable } from 'uniwind';

interface ProgressBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  trackColor: string;
  opacity?: number;
}

const BAR_HEIGHT = 8;
const BORDER_RADIUS = 4;
const emptyPath = Skia.Path.Make();

const ProgressBar: React.FC<ProgressBarProps> = React.memo(({ label, current, goal, unit, color, trackColor, opacity = 1 }) => {
  const [barWidth, setBarWidth] = useState(0);
  const progress = goal > 0 ? current / goal : 0;

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

  const hasGoal = goal > 0;

  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-semibold text-text-primary">{label}</Text>
        <Text className="text-sm text-text-primary">
          {hasGoal ? `${Math.round(current)} / ${Math.round(goal)} ${unit}` : `${Math.round(current)} ${unit}`}
        </Text>
      </View>
      {hasGoal && (
        <View className="h-3" onLayout={onLayout}>
          {barWidth > 0 && clipRect && (
            <Canvas style={canvasStyle}>
              <Group clip={clipRect} opacity={opacity}>
                <Rect x={0} y={0} width={barWidth} height={BAR_HEIGHT} color={trackColor} />
                <Path path={fillPath} color={color} />
                <Group opacity={0.65}>
                  <Path path={overflowPath} color={color} />
                </Group>
              </Group>
            </Canvas>
          )}
        </View>
      )}
    </View>
  );
});

interface ExerciseProgressCardProps {
  exerciseMinutes: number;
  exerciseMinutesGoal: number;
  exerciseCalories: number;
  exerciseCaloriesGoal: number;
}

const ExerciseProgressCard: React.FC<ExerciseProgressCardProps> = ({
  exerciseMinutes,
  exerciseMinutesGoal,
  exerciseCalories,
  exerciseCaloriesGoal,
}) => {
  const [exerciseColor, trackColor] = useCSSVariable([
    '--color-exercise',
    '--color-progress-track',
  ]) as [string, string];

  const hasEntries = exerciseMinutes > 0 || exerciseCalories > 0;

  return (
    <View className="bg-section rounded-xl p-4 mb-2 shadow-sm">
      <Text className="text-md font-bold text-text-primary mb-4">Exercise</Text>
      {hasEntries ? (
        <>
          <ProgressBar
            label="Minutes"
            current={exerciseMinutes}
            goal={exerciseMinutesGoal}
            unit="min"
            color={exerciseColor}
            trackColor={trackColor}
          />
          <View className="h-3" />
          <ProgressBar
            label="Calories"
            current={exerciseCalories}
            goal={exerciseCaloriesGoal}
            unit="Cal"
            color={exerciseColor}
            trackColor={trackColor}
            opacity={0.7}
          />
        </>
      ) : (
        <Text className="text-sm text-text-secondary text-center py-2">No exercise entries yet</Text>
      )}
    </View>
  );
};

export default React.memo(ExerciseProgressCard);
