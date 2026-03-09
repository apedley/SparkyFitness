import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '../Icon';

interface SettingsRowProps {
  label: string;
  subtitle?: string;
  subtitleBelow?: boolean;
  value?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ label, subtitle, subtitleBelow, value, leading, trailing, onPress }) => {
  const content = (
    <>
      {leading}
      {subtitleBelow ? (
        <View className="flex-1">
          <Text className="text-base text-text-primary" numberOfLines={1}>{label}</Text>
          {subtitle !== undefined && (
            <Text className="text-xs text-text-secondary mt-0.5">{subtitle}</Text>
          )}
        </View>
      ) : (
        <>
          <Text className={`text-base text-text-primary${subtitle === undefined ? ' flex-1' : ' shrink-0'}`} numberOfLines={1}>{label}</Text>
          {subtitle !== undefined && (
            <Text className="text-base text-text-secondary mx-1 flex-1 shrink text-right" numberOfLines={1}>{subtitle}</Text>
          )}
        </>
      )}
      {value !== undefined && (
        <Text className="text-base text-text-secondary mr-1">{value}</Text>
      )}
      {trailing}
      {onPress !== undefined && trailing === undefined && (
        <Icon name="chevron-forward" size={16} color="#999" />
      )}
    </>
  );

  if (onPress !== undefined) {
    return (
      <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center px-4 py-3">
      {content}
    </View>
  );
};

export default SettingsRow;
