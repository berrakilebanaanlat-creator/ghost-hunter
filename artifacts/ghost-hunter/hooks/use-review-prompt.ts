import { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  APP_OPEN_COUNT: "review_app_open_count",
  LAST_REVIEW_DATE: "review_last_prompt_date",
  HAS_REVIEWED: "review_has_reviewed",
};

// Configuration
const MIN_APP_OPENS = 3; // Minimum app opens before asking
const MIN_DAYS_BETWEEN_PROMPTS = 7; // Days between review prompts
const MAX_PROMPTS = 3; // Maximum number of times to ask

/**
 * Hook that manages in-app review prompts.
 * Tracks app opens and triggers review at the right moment.
 * 
 * Guidelines followed:
 * - Don't trigger from a button
 * - Don't spam the user
 * - Ask after positive interaction (app usage)
 * - Respect platform limits
 */
export function useReviewPrompt() {
  useEffect(() => {
    // Track app open on mount
    trackAppOpen();
  }, []);

  const trackAppOpen = async () => {
    try {
      const countStr = await AsyncStorage.getItem(STORAGE_KEYS.APP_OPEN_COUNT);
      const currentCount = countStr ? parseInt(countStr, 10) : 0;
      const newCount = currentCount + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.APP_OPEN_COUNT, String(newCount));

      // Check if we should prompt for review
      if (newCount >= MIN_APP_OPENS) {
        await maybeRequestReview();
      }
    } catch (error) {
      // Silently fail - review prompt is not critical
      console.log("Review tracking error:", error);
    }
  };

  const maybeRequestReview = async () => {
    try {
      // Skip on web
      if (Platform.OS === "web") return;

      // Check if user has been prompted too many times
      const hasReviewed = await AsyncStorage.getItem(STORAGE_KEYS.HAS_REVIEWED);
      const promptCount = hasReviewed ? parseInt(hasReviewed, 10) : 0;
      if (promptCount >= MAX_PROMPTS) return;

      // Check if enough time has passed since last prompt
      const lastDateStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_REVIEW_DATE);
      if (lastDateStr) {
        const lastDate = new Date(lastDateStr);
        const now = new Date();
        const daysDiff = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff < MIN_DAYS_BETWEEN_PROMPTS) return;
      }

      // Delay the prompt slightly so it doesn't appear immediately on app open
      setTimeout(async () => {
        try {
          const StoreReview = await import("expo-store-review");
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            await StoreReview.requestReview();
            // Update tracking
            await AsyncStorage.setItem(
              STORAGE_KEYS.LAST_REVIEW_DATE,
              new Date().toISOString()
            );
            await AsyncStorage.setItem(
              STORAGE_KEYS.HAS_REVIEWED,
              String(promptCount + 1)
            );
          }
        } catch (e) {
          console.log("StoreReview request error:", e);
        }
      }, 3000); // 3 second delay after conditions met
    } catch (error) {
      console.log("Review prompt error:", error);
    }
  };

  /**
   * Manually trigger review after a positive action.
   * Call this after user completes a meaningful task.
   */
  const requestReviewAfterAction = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const StoreReview = await import("expo-store-review");
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        const hasReviewed = await AsyncStorage.getItem(STORAGE_KEYS.HAS_REVIEWED);
        const promptCount = hasReviewed ? parseInt(hasReviewed, 10) : 0;
        if (promptCount >= MAX_PROMPTS) return;

        await StoreReview.requestReview();
        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_REVIEW_DATE,
          new Date().toISOString()
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.HAS_REVIEWED,
          String(promptCount + 1)
        );
      }
    } catch (e) {
      console.log("Manual review request error:", e);
    }
  }, []);

  return { requestReviewAfterAction };
}
