import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Ensure this is installed
import { useTheme, type ThemeColors } from "./theme";

export function AppHeader() {
  const { colors } = useTheme();
  const styles = useMemo(() => headerStyles(colors), [colors]);

  return (
    // Allow touches to pass through so navigator edge gestures still work
    // 'edges' prop prevents extra padding at the bottom of the header
    <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
      <View style={styles.headerRow} pointerEvents="none">
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
    backgroundColor: colors.cardGlass,
    // Removed borderBottomWidth to keep it flush
    zIndex: 10, // Ensures it stays above screen content
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 15, // Bottom padding only
    paddingTop: 8,    // Minimal top padding since SafeArea handles the notch
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 42, // Slightly smaller to reduce vertical footprint
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 16,
  },
  brandTitle: {
    color: colors.greenDeep,
    fontWeight: "700",
    fontSize: 17,
  },
  brandSubtitle: {
    color: colors.greenSoft,
    fontSize: 11,
  },
});