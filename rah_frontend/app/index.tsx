import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./theme";

const NEXT_EID_MILAD_DATE = "2026-07-23";

const diffInDays = (targetStr: string) => {
  const today = new Date();
  const target = new Date(`${targetStr}T00:00:00Z`);
  const msPerDay = 86400000;
  return Math.ceil((target.getTime() - today.getTime()) / msPerDay);
};

export default function Index() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [countdownLabel, setCountdownLabel] = useState("--");
  const [highlightCountdown, setHighlightCountdown] = useState(false);

  useEffect(() => {
    const renderCountdown = () => {
      const days = diffInDays(NEXT_EID_MILAD_DATE);
      if (days < 0) {
        setCountdownLabel("Updating...");
        setHighlightCountdown(true);
      } else if (days === 0) {
        setCountdownLabel("Today");
        setHighlightCountdown(true);
      } else {
        setCountdownLabel(`${days} day${days === 1 ? "" : "s"}`);
        setHighlightCountdown(false);
      }
    };

    renderCountdown();
    const id = setInterval(renderCountdown, 21600000);
    return () => clearInterval(id);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.bg,
        },
        container: {
          paddingHorizontal: 18,
          paddingTop: 10,
          paddingBottom: 32,
        },
        hero: {
          paddingTop: 0,
          paddingBottom: 4,
        },
        heroPill: {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: colors.green,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 999,
        },
        pillDot: {
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: colors.gold,
        },
        pillText: {
          color: colors.onAccent,
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        },
        heroTitle: {
          marginTop: 4,
          color: colors.greenDeep,
          fontSize: 30,
          lineHeight: 36,
          fontWeight: "800",
        },
        heroBody: {
          marginTop: 6,
          color: colors.textSecondary,
          fontSize: 16,
          lineHeight: 24,
        },
        heroActions: {
          marginTop: 8,
          gap: 12,
        },
        button: {
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 12,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        primaryButton: {
          backgroundColor: colors.green,
        },
        primaryButtonText: {
          color: colors.onAccent,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        secondaryButton: {
          borderWidth: 2,
          borderColor: colors.gold,
          backgroundColor: colors.goldSoft,
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 4,
        },
        secondaryButtonText: {
          color: colors.greenDeep,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        countdownCard: {
          marginTop: 6,
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
        countdownLabel: {
          color: colors.textMuted,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        },
        countdownValue: {
          marginTop: 4,
          fontSize: 22,
          fontWeight: "800",
          color: colors.greenDeep,
        },
        countdownHighlight: {
          color: colors.gold,
        },
        countdownNote: {
          marginTop: 8,
          fontSize: 10,
          color: colors.textMuted,
        },
        integrity: {
          marginTop: 14,
          fontSize: 11,
          color: colors.textMuted,
        },
        features: {
          marginTop: 18,
          gap: 12,
        },
        featureCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
        },
        featureTitle: {
          color: colors.greenDeep,
          fontSize: 16,
          fontWeight: "700",
        },
        featureBody: {
          marginTop: 6,
          color: colors.textSecondary,
          fontSize: 13,
          lineHeight: 20,
        },
        cta: {
          marginTop: 22,
          backgroundColor: colors.greenDeep,
          borderRadius: 24,
          padding: 20,
        },
        ctaTitle: {
          color: colors.onAccent,
          fontSize: 22,
          fontWeight: "700",
          lineHeight: 28,
        },
        ctaBody: {
          marginTop: 10,
          color: "rgba(255,255,255,0.8)",
          fontSize: 13,
          lineHeight: 20,
        },
        ctaActions: {
          marginTop: 16,
          gap: 12,
        },
        ctaPrimary: {
          backgroundColor: colors.white,
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        },
        ctaPrimaryText: {
          color: colors.green,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        ctaSecondary: {
          borderWidth: 2,
          borderColor: colors.gold,
          backgroundColor: colors.goldSoft,
        },
        ctaSecondaryText: {
          color: colors.greenDeep,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        footer: {
          marginTop: 20,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 6,
        },
        footerText: {
          color: colors.textSecondary,
          fontSize: 12,
        },
        footerLink: {
          color: colors.green,
          fontWeight: "600",
        },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.heroPill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>Rajkot Pilot Launch</Text>
          </View>
          <Text style={styles.heroTitle}>
            Record your Darood Sharif with sincerity & purpose
          </Text>
          <Text style={styles.heroBody}>
            Build a daily rhythm of sending blessings (salawat). Track only what
            you genuinely recite. A transparent Umrah sponsorship (inshaAllah)
            will be announced on Eid Milad.
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.primaryButtonText}>Start Logging</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>
              Days Until Next Eid Milad (12 Rabi' al-Awwal)
            </Text>
            <Text
              style={[
                styles.countdownValue,
                highlightCountdown && styles.countdownHighlight,
              ]}
            >
              {countdownLabel}
            </Text>
          </View>
          <Text style={styles.countdownNote}>
            Subject to regional moon sighting. Configure date in Admin Panel.
          </Text>
          <Text style={styles.integrity}>
            Integrity notice: Automated scripts, inflated counts, or dishonest
            submissions will result in disqualification.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Authentic Entry</Text>
            <Text style={styles.featureBody}>
              Incremental, mindful logging of Darood recitations—no bulk spam.
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Purpose & Reward</Text>
            <Text style={styles.featureBody}>
              Eligible users (criteria published later) may be considered for
              Umrah sponsorship.
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Rajkot First</Text>
            <Text style={styles.featureBody}>
              Phase 1 is limited to Rajkot participants. Wider rollout will
              follow.
            </Text>
          </View>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>
            Stay consistent. Keep intention pure.
          </Text>
          <Text style={styles.ctaBody}>
            Log only what you recite. Your personal discipline matters more than
            leaderboard numbers.
          </Text>
          <View style={styles.ctaActions}>
            <TouchableOpacity
              style={[styles.button, styles.ctaPrimary]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.ctaPrimaryText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.ctaSecondary]}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.ctaSecondaryText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© Rah e Noor. All rights reserved.</Text>
          <Text style={styles.footerText}>
            Developed & Created by {""}
            <Text style={styles.footerLink}>CanStart Technologies</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
