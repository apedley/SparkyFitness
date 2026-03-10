import React from 'react';
import { View, Text } from 'react-native';

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, children }) => {
  const childArray = React.Children.toArray(children);

  return (
    <View className="mb-5">
      {title !== undefined && (
        <Text className="text-xs text-text-muted tracking-wide uppercase mb-1.5 px-4">
          {title}
        </Text>
      )}
      <View className="bg-surface rounded-xl overflow-hidden">
        {childArray.map((child, index) => (
          <React.Fragment key={index}>
            {index > 0 && <View className="h-px bg-border-subtle mx-4" />}
            {child}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

export default SettingsGroup;
