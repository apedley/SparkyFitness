import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCSSVariable } from 'uniwind';
import Icon from '../components/Icon';
import { useServerConnection, useDailySummary, usePreferences, useMeasurements, useWaterIntakeMutation } from '../hooks';
import OnboardingModal, { shouldShowOnboardingModal } from '../components/OnboardingModal';
import CalorieRingCard from '../components/CalorieRingCard';
import MacroCard from '../components/MacroCard';
import FoodSummary from '../components/FoodSummary';
import ExerciseSummary from '../components/ExerciseSummary';
import { getActiveServerConfig } from '../services/storage';
import { calculateEffectiveBurned, calculateCalorieBalance } from '../services/calculations';
import { addDays, formatDateLabel, getTodayDate } from '../utils/dateUtils';
import HydrationGauge from '../components/HydrationGauge';

interface SummaryScreenProps {
  navigation: { navigate: (screen: string) => void };
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const hasCheckedOnboarding = useRef(false);
  const lastKnownToday = useRef(getTodayDate());

  // Only reset to today when the calendar day has actually changed (midnight rollover)
  useFocusEffect(
    useCallback(() => {
      const today = getTodayDate();
      if (today !== lastKnownToday.current) {
        lastKnownToday.current = today;
        setSelectedDate(today);
      }
    }, [])
  );

  const isToday = selectedDate === getTodayDate();
  const goToPreviousDay = () => setSelectedDate(prev => addDays(prev, -1));
  const goToNextDay = () => setSelectedDate(prev => {
    const today = getTodayDate();
    const next = addDays(prev, 1);
    return next > today ? prev : next;
  });
  const goToToday = () => setSelectedDate(getTodayDate());

  // Check for onboarding on initial mount only
  useEffect(() => {
    const checkOnboarding = async () => {
      if (hasCheckedOnboarding.current) return;
      hasCheckedOnboarding.current = true;

      if (!shouldShowOnboardingModal()) return;

      const activeConfig = await getActiveServerConfig();
      if (!activeConfig) {
        setShowOnboardingModal(true);
      }
    };

    checkOnboarding();
  }, []);

  const { isConnected, isLoading: isConnectionLoading } = useServerConnection();
  const { summary, isLoading, isError, refetch } = useDailySummary({
    date: selectedDate,
    enabled: isConnected,
  });
  const { preferences, isLoading: isPreferencesLoading, isError: isPreferencesError } = usePreferences({
    enabled: isConnected,
  });
  const { measurements, isLoading: isMeasurementsLoading, isError: isMeasurementsError } = useMeasurements({
    date: selectedDate,
    enabled: isConnected,
  });
  const { increment: incrementWater, decrement: decrementWater, isReady: isWaterReady } = useWaterIntakeMutation({
    date: selectedDate,
  });

  // Get macro colors from CSS variables (theme-aware)
  const [proteinColor, carbsColor, fatColor, fiberColor, progressTrackOverfillColor] = useCSSVariable([
    '--color-macro-protein',
    '--color-macro-carbs',
    '--color-macro-fat',
    '--color-macro-fiber',
    '--color-progress-overfill',
  ]) as [string, string, string, string, string];

  const secondaryTextColor = useCSSVariable('--color-text-secondary') as string;


  // Render content based on state
  const renderContent = () => {
    // No server configured
    if (!isConnectionLoading && !isConnected) {
      return (
        <View className="flex-1 items-center justify-center p-8 shadow-sm">
          <Icon name="cloud-offline" size={64} color="#9CA3AF" />
          <Text className="text-text-muted text-lg text-center mt-4">
            No server configured
          </Text>
          <Text className="text-text-muted text-sm text-center mt-2">
            Configure your server connection in Settings to view your daily summary.
          </Text>
          <TouchableOpacity
            className="bg-accent-primary rounded-xl py-3 px-6 mt-6"
            onPress={() => navigation.navigate('Settings')}
          >
            <Text className="text-white font-semibold">Go to Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Loading state
    if (isLoading || isConnectionLoading || isPreferencesLoading || isMeasurementsLoading) {
      return (
        <View className="flex-1 items-center justify-center p-8 shadow-sm">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-text-muted text-base mt-4">Loading summary...</Text>
        </View>
      );
    }

    // Error state
    if (isError || isPreferencesError || isMeasurementsError) {
      return (
        <View className="flex-1 items-center justify-center p-8 shadow-sm">
          <Icon name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-text-muted text-lg text-center mt-4">
            Failed to load summary
          </Text>
          <Text className="text-text-muted text-sm text-center mt-2">
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            className="bg-accent-primary rounded-xl py-3 px-6 mt-6"
            onPress={() => refetch()}
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Data loaded successfully
    if (!summary || !preferences) {
      return null;
    }

    const totalBurned = calculateEffectiveBurned({
      activeCalories: summary.activeCalories,
      otherExerciseCalories: summary.otherExerciseCalories,
      steps: measurements?.steps || 0,
    });

    const { netCalories, remainingCalories } = calculateCalorieBalance({
      calorieGoal: summary.calorieGoal,
      caloriesConsumed: summary.caloriesConsumed,
      caloriesBurned: totalBurned,
    });
    const progressPercent = summary.calorieGoal > 0 ? netCalories / summary.calorieGoal : 0;

    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <CalorieRingCard
          caloriesConsumed={summary.caloriesConsumed}
          caloriesBurned={totalBurned}
          calorieGoal={summary.calorieGoal}
          remainingCalories={remainingCalories}
          progressPercent={progressPercent}
        />
        {/* Macros Section - 2x2 grid */}
        <View className="flex-row flex-wrap justify-between">
          <MacroCard
            label="Protein"
            consumed={summary.protein.consumed}
            goal={summary.protein.goal}
            color={proteinColor}
            overfillColor={progressTrackOverfillColor}
          />
          <MacroCard
            label="Carbs"
            consumed={summary.carbs.consumed}
            goal={summary.carbs.goal}
            color={carbsColor}
            overfillColor={progressTrackOverfillColor}
          />
          <MacroCard
            label="Fat"
            consumed={summary.fat.consumed}
            goal={summary.fat.goal}
            color={fatColor}
            overfillColor={progressTrackOverfillColor}
          />
          <MacroCard
            label="Fiber"
            consumed={summary.fiber.consumed}
            goal={summary.fiber.goal}
            color={fiberColor}
            overfillColor={progressTrackOverfillColor}
          />
        </View>

        {/* Food Summary */}
        <FoodSummary foodEntries={summary.foodEntries} />

        {/* Exercise Summary */}
        <ExerciseSummary exerciseEntries={summary.exerciseEntries} />


        <HydrationGauge
          consumed={summary.waterConsumed}
          goal={summary.waterGoal}
          onIncrement={isWaterReady ? incrementWater : undefined}
          onDecrement={isWaterReady ? decrementWater : undefined}
          disableDecrement={summary.waterConsumed <= 0}
        />
      </ScrollView>
    );
  };

  const handleOnboardingGoToSettings = () => {
    setShowOnboardingModal(false);
    navigation.navigate('Settings');
  };

  const handleOnboardingDismiss = () => {
    setShowOnboardingModal(false);
  };

  return (
    <View className="flex-1 bg-canvas">
      {/* Date nav header — always visible when server is connected */}
      {!isConnectionLoading && isConnected && (
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}
              className="flex-row justify-between items-center pb-4">
          <Text className="text-2xl font-bold text-text-primary">Summary</Text>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={goToPreviousDay} className="p-2">
              <Icon name="chevron-back" size={18} color={secondaryTextColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} className="px-2">
              <Text className="text-text-secondary text-base font-medium">
                {formatDateLabel(selectedDate)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToNextDay} disabled={isToday}
                              className="p-2" style={isToday ? { opacity: 0.3 } : undefined}>
              <Icon name="chevron-forward" size={18} color={secondaryTextColor} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {renderContent()}

      <OnboardingModal
        visible={showOnboardingModal}
        onGoToSettings={handleOnboardingGoToSettings}
        onDismiss={handleOnboardingDismiss}
      />
    </View>
  );
};

export default SummaryScreen;
