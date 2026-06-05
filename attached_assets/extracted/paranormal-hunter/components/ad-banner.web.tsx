/**
 * AdBanner - WEB PLATFORM
 * Web'de reklamlar gösterilmez
 */
import React from 'react';

interface AdBannerProps {
  size?: 'banner' | 'large' | 'medium' | 'full' | 'adaptive';
}

export function AdBanner(_props: AdBannerProps) {
  // Web'de reklam gösterilmez
  return null;
}
