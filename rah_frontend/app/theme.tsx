import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

/* ── Light palette ─────────────────────────────────────────── */
const light = {
  // Brand
  green: "#0B6B3A",
  greenDeep: "#064D29",
  greenSoft: "#0F7F47",
  gold: "#C89E41",
  goldSoft: "#E8D6A3",
  // Surfaces
  beige: "#F9F6EF",
  white: "#FFFFFF",
  bg: "#F9F6EF",
  card: "#FFFFFF",
  cardGlass: "rgba(255,255,255,0.85)",
  inputBg: "#FFFFFF",
  // Text
  text: "#064D29",
  textSecondary: "rgba(11,107,58,0.7)",
  textMuted: "rgba(11,107,58,0.55)",
  onAccent: "#FFFFFF", // text / icons on coloured surfaces
  // Borders
  border: "rgba(200,158,65,0.3)",
  borderLight: "rgba(200,158,65,0.15)",
  separator: "rgba(0,0,0,0.04)",
  // Effects
  overlay: "rgba(6,77,41,0.25)",
  goldTint: "rgba(200,158,65,0.1)",
  greenTint: "rgba(11,107,58,0.06)",
  // Status
  danger: "#c53030",
  dangerBg: "#FFF5F5",
  dangerBorder: "#fca5a5",
};

/* ── Dark palette ──────────────────────────────────────────── */
const dark: typeof light = {
  green: "#2DA85C",
  greenDeep: "#D4E8DA",
  greenSoft: "#4EC97A",
  gold: "#D4AF61",
  goldSoft: "#3D3520",
  beige: "#0F1114",
  white: "#1A1D22",
  bg: "#0F1114",
  card: "#1A1D22",
  cardGlass: "rgba(26,29,34,0.92)",
  inputBg: "#242830",
  text: "#E8E4DD",
  textSecondary: "rgba(212,228,218,0.7)",
  textMuted: "rgba(212,228,218,0.45)",
  onAccent: "#FFFFFF",
  border: "rgba(200,158,65,0.2)",
  borderLight: "rgba(200,158,65,0.1)",
  separator: "rgba(255,255,255,0.06)",
  overlay: "rgba(0,0,0,0.5)",
  goldTint: "rgba(200,158,65,0.08)",
  greenTint: "rgba(45,168,92,0.08)",
  danger: "#EF5350",
  dangerBg: "#2C1B1B",
  dangerBorder: "#7F1D1D",
};

/* ── Types ─────────────────────────────────────────────────── */
export type ThemeColors = typeof light;
export type ThemeMode = "system" | "light" | "dark";

type ThemeContextType = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

/* ── Context ───────────────────────────────────────────────── */
const ThemeContext = createContext<ThemeContextType>({
  colors: light,
  isDark: false,
  mode: "system",
  setMode: () => {},
});

/* ── Provider ──────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Default to light mode so the app opens in light theme by default.
  const [mode, setMode] = useState<ThemeMode>("light");

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const colors = isDark ? dark : light;

  const value = useMemo(
    () => ({ colors, isDark, mode, setMode }),
    [colors, isDark, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ── Hook ──────────────────────────────────────────────────── */
export function useTheme() {
  return useContext(ThemeContext);
}

