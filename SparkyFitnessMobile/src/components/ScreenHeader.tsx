import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import Icon from './Icon';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, rightContent }) => {
  const insets = useSafeAreaInsets();
  const textColor = useCSSVariable('--color-text-primary') as string;

  return (
    <View style={{ paddingTop: insets.top + 16 }} className="flex-row items-center justify-between px-4 pb-4">
      <View className="flex-row items-center flex-1">
        {onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="mr-2">
            <Icon name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
        )}
        <Text className="text-2xl font-bold text-text-primary">{title}</Text>
      </View>
      {rightContent}
    </View>
  );
};

export default ScreenHeader;
