import { View, Text } from 'react-native';
import { Platform } from 'react-native';

export function BannerAdComponent() {
  // Web platformunda reklamlar gösterilmez
  if (Platform.OS === 'web') {
    return null;
  }

  // Native platformlarda banner reklam alanı
  return (
    <View className="items-center justify-center bg-surface py-2 px-4">
      <Text className="text-xs text-muted">
        Reklam Alanı
      </Text>
    </View>
  );
}
