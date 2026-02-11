import React, { useCallback, useMemo } from 'react';
import { Canvas, Path, Circle as SkiaCircle, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

interface ProgressRingProps {
  progress: number; // 0-1 value (capped at 1 for display)
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor: string;
}

const emptyPath = Skia.Path.Make();

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
    }, [progressCapped]) // animatedProgress is a stable ref from useSharedValue
  );

  const oval = useMemo(() => ({
    x: center - radius,
    y: center - radius,
    width: radius * 2,
    height: radius * 2,
  }), [center, radius]);

  const progressPath = useDerivedValue(() => {
    const sweepAngle = animatedProgress.value * 360;
    if (sweepAngle <= 0) return emptyPath;
    const path = Skia.Path.Make();
    path.addArc(oval, -90, sweepAngle);
    return path;
  });

  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  return (
    <Canvas style={canvasStyle}>
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

export default React.memo(ProgressRing);
