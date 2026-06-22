import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_PERMISSION_KEY = "@notif_permission_asked_v1";
const NOTIF_SCHEDULED_KEY = "@notif_scheduled_v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const MESSAGES: { title: string; body: string }[] = [
  {
    title: "Paranormal aktivite yüksek",
    body: "Bu gece alınan sinyaller normalin üzerinde. Seans başlatmak ister misin?",
  },
  {
    title: "VOX sinyal aldı",
    body: "Frekans taraması tamamlandı. Beklenmedik bir ses örüntüsü tespit edildi.",
  },
  {
    title: "Gece seansı için uygun koşullar",
    body: "Elektromanyetik ortam sakin. Şu an iletişim kurmak için en iyi zaman.",
  },
  {
    title: "Bağlantı kanalı açık",
    body: "ITC motoru hazır. Son 24 saatte bu bölgede aktivite kaydedildi.",
  },
  {
    title: "Anomali tespit edildi",
    body: "EMF verileri anormal bir dalgalanma gösteriyor. Kontrol etmek ister misin?",
  },
  {
    title: "Seans zamanı",
    body: "Geceleri kayıt kalitesi artar. VOX motorunu başlat.",
  },
  {
    title: "Freakns değişimi",
    body: "Ortam frekansında beklenmedik bir kayma gözlemlendi.",
  },
  {
    title: "Kayıtların hazır",
    body: "Son seansın verileri arşivlendi. Kanıt duvarını incele.",
  },
  {
    title: "Gece yarısı yaklaşıyor",
    body: "00:00-03:00 arası paranormal aktivite en yüksek seviyeye ulaşır.",
  },
  {
    title: "Ortam değişimi",
    body: "Mevcut koşullar seans açmak için uygun. Sistemi hazırla.",
  },
];

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const already = await AsyncStorage.getItem(NOTIF_PERMISSION_KEY);
  if (already === "denied") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(
    NOTIF_PERMISSION_KEY,
    status === "granted" ? "granted" : "denied"
  );
  return status === "granted";
}

export async function scheduleReEngagementNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const alreadyScheduled = await AsyncStorage.getItem(NOTIF_SCHEDULED_KEY);
  if (alreadyScheduled === "1") return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  for (let day = 1; day <= 14; day++) {
    const msg = MESSAGES[(day - 1) % MESSAGES.length];

    const hours = day % 3 === 0 ? 21 : day % 3 === 1 ? 20 : 22;
    const minutes = (day * 7 + 13) % 60;

    const trigger = new Date(now);
    trigger.setDate(now.getDate() + day);
    trigger.setHours(hours, minutes, 0, 0);

    if (trigger > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
        },
      });
    }
  }

  await AsyncStorage.setItem(NOTIF_SCHEDULED_KEY, "1");
}

export async function resetNotificationSchedule(): Promise<void> {
  await AsyncStorage.removeItem(NOTIF_SCHEDULED_KEY);
  await Notifications.cancelAllScheduledNotificationsAsync();
}
