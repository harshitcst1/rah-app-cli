import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "./theme";

export function AppHeader() {
  const { colors } = useTheme();
  const styles = useMemo(() => headerStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>RN</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Rah e Noor</Text>
            <Text style={styles.brandSubtitle}>Devotional Recitation</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const headerStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    paddingBottom: 12,
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardGlass,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  brandTitle: {
    color: colors.greenDeep,
    fontWeight: "700",
    fontSize: 18,
  },
  brandSubtitle: {
    color: colors.greenSoft,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
