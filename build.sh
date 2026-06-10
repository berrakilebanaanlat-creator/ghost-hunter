#!/bin/bash
if [ -z "$EXPO_TOKEN" ]; then
  echo ""
  echo "EXPO_TOKEN bulunamadi! Shell'i kapatip yeniden ac."
  echo ""
  exit 1
fi

cd artifacts/ghost-hunter

echo ">>> APK build basliyor..."
EXPO_TOKEN=$EXPO_TOKEN ./node_modules/.bin/eas build --platform android --profile preview --non-interactive

echo ""
echo ">>> AAB build basliyor..."
EXPO_TOKEN=$EXPO_TOKEN ./node_modules/.bin/eas build --platform android --profile production --non-interactive
