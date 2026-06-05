import { View, Text, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface InAppProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
}

export const IN_APP_PRODUCTS: InAppProduct[] = [
  {
    id: 'theme_dark',
    name: 'Karanlık Tema',
    description: 'Özel karanlık tema paketi',
    price: 0.99,
    icon: '🌙',
  },
  {
    id: 'theme_neon',
    name: 'Neon Tema',
    description: 'Parlak neon renk paleti',
    price: 0.99,
    icon: '⚡',
  },
  {
    id: 'export_data',
    name: 'Veri Dışa Aktarma',
    description: 'Tüm verilerinizi CSV olarak indirin',
    price: 2.99,
    icon: '📥',
  },
  {
    id: 'advanced_reports',
    name: 'Gelişmiş Raporlar',
    description: 'Detaylı analiz ve istatistikler',
    price: 1.99,
    icon: '📊',
  },
  {
    id: 'cloud_backup',
    name: 'Bulut Yedekleme',
    description: '100GB bulut depolama alanı',
    price: 4.99,
    icon: '☁️',
  },
  {
    id: 'ai_analysis',
    name: 'AI Analizi',
    description: 'Yapay zeka destekli paranormal analiz',
    price: 3.99,
    icon: '🤖',
  },
];

interface InAppPurchasesProps {
  onPurchase?: (productId: string) => void;
}

export function InAppPurchases({ onPurchase }: InAppPurchasesProps) {
  const handlePurchase = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPurchase?.(productId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="gap-3 px-4 py-2 flex-row">
        {IN_APP_PRODUCTS.map((product) => (
          <Pressable
            key={product.id}
            onPress={() => handlePurchase(product.id)}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <View className="bg-surface border border-primary rounded-lg p-3 w-32 items-center gap-2">
              <Text className="text-3xl">{product.icon}</Text>
              <Text className="text-xs font-bold text-foreground text-center">
                {product.name}
              </Text>
              <Text className="text-xs text-muted text-center">
                {product.description}
              </Text>
              <View className="bg-primary px-2 py-1 rounded mt-1">
                <Text className="text-xs font-bold text-background">
                  ${product.price}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
