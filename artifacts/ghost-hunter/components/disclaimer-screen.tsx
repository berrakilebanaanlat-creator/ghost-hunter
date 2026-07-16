import { useState, useEffect } from "react";
import { Text, View, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { t } from "@/lib/i18n";

const DISCLAIMER_KEY = "disclaimer_accepted_v3";

interface DisclaimerScreenProps {
  onAccept: () => void;
}

export function DisclaimerScreen({ onAccept }: DisclaimerScreenProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const handleAccept = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, "true");
    } catch {}
    onAccept();
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isEnd) setScrolledToEnd(true);
  };

  return (
    <View style={styles.container}>
      {/* Eğlence Uyarısı — en üstte, büyük ve net */}
      <View style={styles.entertainmentHeader}>
        <Text style={styles.entertainmentTitle}>FOR ENTERTAINMENT ONLY</Text>
        <Text style={styles.entertainmentDesc}>
          THIS IS A SIMULATION APP.{"\n"}It does not detect ghosts, spirits, or any real paranormal activity.{"\n"}All outputs are randomly generated for entertainment.
        </Text>
      </View>

      {/* Üst başlık */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("disclaimer.title").toUpperCase()}</Text>
        <Text style={styles.subtitle}>{t("disclaimer.readAll")}</Text>
      </View>

      {/* Disclaimer metni */}
      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.entertainmentBadge}>⚠️  SIMULATION · NOT REAL · ENTERTAINMENT ONLY</Text>
          <Text style={styles.entertainmentNote}>
            This app is a simulation designed for entertainment purposes only. All readings, detections, and outputs are randomly generated. This app cannot and does not detect ghosts, spirits, or any supernatural entities.
          </Text>

          <Text style={styles.sectionTitle}>Uygulama Hakkında</Text>
          <Text style={styles.bodyText}>
            Antik Ghost App, paranormal araştırma ve eğlence amaçlı olarak tasarlanmış bir mobil uygulamadır. 
            Uygulama, telefonunuzdaki sensörleri kullanarak ortamdaki fiziksel değişiklikleri ölçer ve bunlara 
            tepki verir. Tüm ölçümler ve çıktılar yalnızca eğlence amaçlıdır; gerçek paranormal aktiviteyi temsil etmez.
          </Text>

          <Text style={styles.sectionTitle}>Paranormal Araştırma Uyarısı</Text>
          <Text style={styles.bodyText}>
            Ölüm sonrası yaşam (ahiret) teorik bir kavram olup, şu anda bilim camiasında kabul edilen doğa 
            yasalarıyla desteklenmemekte veya açıklanmamaktadır. "Paranormal" olarak sınıflandırılan fenomenler, 
            mevcut bilimsel anlayışla tam olarak açıklanamamaktadır.
          </Text>
          <Text style={styles.bodyText}>
            Bu uygulamadaki tüm araçlar (EMF Tarayıcı, VOX Ruh İletişim Cihazı, EVP Kaydedici, SLS Kamera, 
            Paranormal Radar) yalnızca ortamdaki fiziksel değişiklikleri ölçmek ve bunlara tepki vermek için 
            tasarlanmıştır.
          </Text>

          <Text style={styles.sectionTitle}>Önemli Uyarılar</Text>
          <Text style={styles.bulletText}>
            ● Bu uygulama önemli yaşam kararları vermek için kullanılmamalıdır.
          </Text>
          <Text style={styles.bulletText}>
            ● Kesin bir iletişim biçimi olarak kabul edilmemelidir.
          </Text>
          <Text style={styles.bulletText}>
            ● Keder, kayıp veya psikolojik sorunlarla başa çıkmak için tek başına kullanılmamalıdır. 
            Profesyonel destek almak için bir uzmanla görüşünüz.
          </Text>
          <Text style={styles.bulletText}>
            ● Uygulama tarafından üretilen kelimeler, sesler veya veriler geliştiricinin görüşlerini, 
            fikirlerini veya inançlarını temsil etmez.
          </Text>
          <Text style={styles.bulletText}>
            ● Hiçbir çıktı talimat, öneri veya talep olarak yorumlanmamalıdır.
          </Text>
          <Text style={styles.bulletText}>
            ● Sağlık sorunlarınız varsa mutlaka bir sağlık uzmanına başvurunuz.
          </Text>

          <Text style={styles.sectionTitle}>Sorumluluk Sınırı</Text>
          <Text style={styles.bodyText}>
            Geliştirici ve bağlı kuruluşları, bu uygulamanın kullanımından kaynaklanan doğrudan veya dolaylı 
            hiçbir zarardan sorumlu tutulamaz. Uygulama "olduğu gibi" sunulmaktadır ve herhangi bir garanti 
            verilmemektedir.
          </Text>

          <Text style={styles.sectionTitle}>Yaş Sınırı</Text>
          <Text style={styles.bodyText}>
            Bu uygulama 12 yaş ve üzeri kullanıcılar için tasarlanmıştır. 18 yaşından küçük kullanıcıların 
            ebeveyn gözetiminde kullanması önerilir.
          </Text>

          <Text style={styles.sectionTitle}>Kabul</Text>
          <Text style={styles.bodyText}>
            "Kabul Ediyorum" butonuna basarak yukarıdaki tüm koşulları okuduğunuzu, anladığınızı ve kabul 
            ettiğinizi onaylarsınız. Bu uygulamayı yalnızca paranormal araştırma ve eğlence amaçlı 
            kullanacağınızı taahhüt edersiniz.
          </Text>

          <View style={{ height: 12 }} />
        </ScrollView>
      </View>

      {/* Alt butonlar */}
      <View style={styles.footer}>
        {!scrolledToEnd && (
          <Text style={styles.scrollHint}>{t("disclaimer.readAll")} ↓</Text>
        )}
        <Pressable
          onPress={handleAccept}
          disabled={!scrolledToEnd}
          style={({ pressed }) => [
            styles.acceptBtn,
            !scrolledToEnd && styles.acceptBtnDisabled,
            pressed && scrolledToEnd && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          <Text style={[styles.acceptBtnText, !scrolledToEnd && styles.acceptBtnTextDisabled]}>
            {t("disclaimer.accept").toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** AsyncStorage'dan disclaimer kabul durumunu kontrol et */
export async function isDisclaimerAccepted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(DISCLAIMER_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060609",
    paddingTop: Platform.OS === "web" ? 20 : 40,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF990015",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FF9900",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#5A5A70",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scrollContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1A1A2A",
    backgroundColor: "#0A0A12",
    overflow: "hidden",
    maxHeight: "55%",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D0D0E0",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 12,
    color: "#7A7A90",
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  bulletText: {
    fontSize: 12,
    color: "#7A7A90",
    lineHeight: 18,
    letterSpacing: 0.3,
    paddingLeft: 4,
    marginBottom: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    gap: 8,
  },
  scrollHint: {
    fontSize: 10,
    color: "#FF9900",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  acceptBtn: {
    backgroundColor: "#FF990015",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FF990030",
    paddingVertical: 16,
    alignItems: "center",
  },
  acceptBtnDisabled: {
    backgroundColor: "#1A1A2A",
    borderColor: "#1A1A2A",
    opacity: 0.4,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF9900",
    letterSpacing: 4,
  },
  acceptBtnTextDisabled: {
    color: "#3A3A50",
  },
  entertainmentHeader: {
    backgroundColor: "#FF990015",
    borderBottomWidth: 1,
    borderBottomColor: "#FF990030",
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
  },
  entertainmentTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FF9900",
    letterSpacing: 2,
    textAlign: "center",
  },
  entertainmentDesc: {
    fontSize: 11,
    color: "#A07020",
    textAlign: "center",
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  entertainmentBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FF9900",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  entertainmentNote: {
    fontSize: 12,
    color: "#A07020",
    lineHeight: 18,
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
