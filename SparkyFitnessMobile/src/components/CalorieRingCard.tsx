import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Canvas, Path, Circle as SkiaCircle, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

interface ProgressRingProps {
  progress: number; // 0-1 value (capped at 1 for display)
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size,
  strokeWidth,
  color,
  backgroundColor,
}) => {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const progressCapped = Math.min(Math.max(progress, 0), 1);

  const animatedProgress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      animatedProgress.value = 0;
      animatedProgress.value = withTiming(progressCapped, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }, [progressCapped, animatedProgress])
  );

  const progressPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const sweepAngle = animatedProgress.value * 360;
    if (sweepAngle > 0) {
      const startAngle = -90; // Start from top
      const oval = {
        x: center - radius,
        y: center - radius,
        width: radius * 2,
        height: radius * 2,
      };
      path.addArc(oval, startAngle, sweepAngle);
    }
    return path;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaCircle
        cx={center}
        cy={center}
        r={radius}
        style="stroke"
        strokeWidth={strokeWidth}
        color={backgroundColor}
      />
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={strokeWidth}
        color={color}
        strokeCap="round"
      />
    </Canvas>
  );
};

interface SideStatProps {
  label: string;
  value: number;
}

const SideStat: React.FC<SideStatProps> = ({ label, value }) => (
  <View className="items-center justify-center flex-1">
    <Text className="text-xl font-bold text-text-primary">
      {Math.round(value).toLocaleString()}
    </Text>
    <Text className="text-text-secondary text-sm mt-1">{label}</Text>
  </View>
);

interface CalorieRingCardProps {
  caloriesConsumed: number;
  caloriesBurned: number;
  calorieGoal: number;
  remainingCalories: number;
  progressPercent: number;
}

const CalorieRingCard: React.FC<CalorieRingCardProps> = ({
  caloriesConsumed,
  caloriesBurned,
  calorieGoal,
  remainingCalories,
  progressPercent,
}) => {
  const [progressTrackColor, progressFillColor] = useCSSVariable([
    '--color-progress-track',
    '--color-progress-fill',
  ]) as [string, string];

  const displayRemaining = Math.round(remainingCalories);
  const remainingText = displayRemaining >= 0
    ? `${displayRemaining.toLocaleString()}`
    : `+${Math.abs(displayRemaining).toLocaleString()}`;

  return (
    <View className="bg-section rounded-xl p-4 mb-4 shadow-sm">
      <View className="flex-row items-center justify-center">
        <SideStat label="Consumed" value={caloriesConsumed} />

        <View className="relative items-center justify-center mx-2">
          <View>
            <ProgressRing
              progress={progressPercent}
              size={160}
              strokeWidth={12}
              color={progressFillColor}
              backgroundColor={progressTrackColor}
            />
          </View>
          <View className="absolute items-center justify-center">
            <Text className="text-2xl font-bold text-text-primary">
              {remainingText}
            </Text>
            <Text className="text-text-secondary text-xs">
              {displayRemaining >= 0 ? 'remaining' : 'over goal'}
            </Text>
            <Text className="text-text-muted text-[10px] mt-0.5">
              of {calorieGoal.toLocaleString()} kcal
            </Text>
          </View>
        </View>

        <SideStat label="Burned" value={caloriesBurned} />
      </View>
    </View>
  );
};

export default CalorieRingCard;
