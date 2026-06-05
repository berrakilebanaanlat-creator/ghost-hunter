/**
 * PriceShimmer — Fiyat yüklenirken gösterilen shimmer/skeleton efekti.
 * Google Play Billing API'den fiyat çekilirken veya cache'den yüklenirken
 * "..." yerine profesyonel bir parlama animasyonu gösterir.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';

interface PriceShimmerProps {
  /** Shimmer genişliği (px) */
  width?: number;
  /** Shimmer yüksekliği (px) */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Arka plan rengi */
  backgroundColor?: string;
  /** Parlama rengi */
  shimmerColor?: string;
}

export function PriceShimmer({
  width = 72,
  height = 18,
  borderRadius = 4,
  backgroundColor = '#1A1A2A',
  shimmerColor = '#2A2A40',
}: PriceShimmerProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius, backgroundColor }]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            width,
            height,
            borderRadius,
            backgroundColor: shimmerColor,
            opacity,
          },
        ]}
      />
    </View>
  );
}

/**
 * PriceShimmerLarge — Daha büyük fiyat alanları için (plan fiyatı gibi)
 */
export function PriceShimmerLarge() {
  return <PriceShimmer width={90} height={22} borderRadius={5} />;
}

/**
 * PriceShimmerSmall — Küçük fiyat alanları için (aylık karşılık gibi)
 */
export function PriceShimmerSmall() {
  return <PriceShimmer width={56} height={12} borderRadius={3} />;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
