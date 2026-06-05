import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface PremiumLockProps {
  feature: string;
  children?: React.ReactNode;
}

export function PremiumLock({ feature, children }: PremiumLockProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/premium');
  };

  return (
    <Pressable onPress={handleUpgrade}>
      <View className="bg-surface/50 border-2 border-dashed border-primary rounded-lg p-6 items-center justify-center gap-3">
        <Text className="text-3xl">🔒</Text>
        <Text className="text-sm font-semibold text-foreground text-center">
          {feature}
        </Text>
        <Text className="text-xs text-muted text-center">
          Premium'a yükselt ve kilidini aç
        </Text>
        <View className="bg-primary px-4 py-2 rounded-lg mt-2">
          <Text className="text-xs font-bold text-background">
            Premium'a Yükselt
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
