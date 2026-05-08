import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../theme";
import { api } from "../services/api";

type LeaderItem = {
  rank: number;
  total: number;
  user?: { id?: number; name?: string; city?: string };
};

const CITIES = ["Rajkot", "Ahmedabad", "Surat", "Mumbai", "Vadodara", "New Delhi"];

export default function Leaderboard() {
  const { colors } = useTheme();
  const [scope, setScope] = useState<"city" | "global">("city");
  const [range, setRange] = useState<"season" | "month" | "week" | "today">("season");
  const [city, setCity] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LeaderItem[]>([]);
  const [top3, setTop3] = useState<LeaderItem[]>([]);
  const [yourRank, setYourRank] = useState<LeaderItem | null>(null);
  const [endsInText, setEndsInText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLeaderboard(scope, range, scope === "city" ? city : undefined);
      if (!data?.ok) throw new Error("bad response");
      setTop3(Array.isArray(data.top3) ? data.top3 : []);
      setItems(Array.isArray(data.items) ? data.items : []);
      setYourRank(data.your_rank || null);
      setEndsInText(data.meta?.ends_in_days > 0 ? `Ends in ${data.meta.ends_in_days} days` : "Live");
    } catch {
      setError("Unable to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [city, range, scope]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        (it.user?.name || "").toLowerCase().includes(q) ||
        (it.user?.city || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const renderPodium = () => {
    const podiumOrder: LeaderItem[] = [];
    if (top3[1]) podiumOrder.push(top3[1]);
    if (top3[0]) podiumOrder.push(top3[0]);
    if (top3[2]) podiumOrder.push(top3[2]);

    return (
      <View style={styles.medalsRow}>
        {podiumOrder.map((r) => {
          const isFirst = r.rank === 1;
          return (
            <View key={r.rank} style={[styles.medalCard, isFirst && styles.medalFirst]}>
              <View style={[styles.medalChip, isFirst && { backgroundColor: colors.goldSoft }]}>
                <Text style={styles.medalChipText}>{r.rank}</Text>
              </View>
              <Text numberOfLines={1} style={styles.medalName}>{r.user?.name ?? "User"}</Text>
              <Text numberOfLines={1} style={styles.medalCity}>{r.user?.city ?? ""}</Text>
              <Text style={[styles.medalTotal, { color: colors.text }]}>{(r.total ?? 0).toLocaleString()}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeaderContainer}>
      <View style={styles.headerCard}>
        <View style={styles.centeredHeader}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Umrah Sponsorship • 1447 AH</Text>
          <View style={styles.endsBadge}>
            <Text style={styles.endsBadgeText}>{endsInText ?? "Ends soon"}</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <View style={styles.tabGroup}>
            {(["city", "global"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setScope(s)}
                activeOpacity={0.8}
                style={[styles.tabBtn, scope === s && styles.tabActive]}
              >
                <Text style={[styles.tabText, scope === s && styles.tabTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segScroll}>
          <View style={styles.segGroup}>
            {(["season", "month", "week", "today"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRange(r)}
                style={[styles.segBtn, range === r && styles.segActive]}
              >
                <Text style={[styles.segText, range === r && styles.segTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {scope === "city" && (
          <TouchableOpacity style={styles.citySelect} onPress={() => setCityOpen(true)}>
            <Text style={styles.citySelectText}>{city || "Select City"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.podiumCard}>
        <Text style={styles.sectionTitle}>Top Performers</Text>
        {loading ? <ActivityIndicator color={colors.goldSoft} size="large" /> : renderPodium()}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search by name or city..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerPadding}>
      {yourRank && (
        <View style={styles.yourBlock}>
          <View style={styles.rankLeft}>
            <Text style={[styles.rankNumber, { color: colors.text }]}>{yourRank.rank}</Text>
            <View>
              <Text style={styles.rankName}>{yourRank.user?.name ?? "You"}</Text>
              <Text style={styles.rankCity}>{yourRank.user?.city ?? "Your City"}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.rankTotal}>{(yourRank.total ?? 0).toLocaleString()}</Text>
            <Text style={styles.smallMuted}>Your position</Text>
          </View>
        </View>
      )}

      <View style={styles.notesCard}>
        <Text style={styles.notesTitle}>Guidelines</Text>
        <Text style={styles.note}>• Genuine recitations only. Logs are reviewed.</Text>
        <Text style={styles.note}>• #1 receives Umrah sponsorship (T&C apply).</Text>
      </View>
      <Text style={styles.footerText}>© {new Date().getFullYear()} Rah e Noor</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => `${item.rank}-${index}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.container}
          renderItem={({ item, index }) => (
            <View style={styles.listCardItem}>
              <View style={styles.rankRow}>
                <View style={styles.rankLeft}>
                  <Text style={[styles.rankNumber, { color: colors.text }]}>{item.rank}</Text>
                  <View>
                    <Text style={styles.rankName}>{item.user?.name ?? "User"}</Text>
                    {item.user?.city && <Text style={styles.rankCity}>{item.user.city}</Text>}
                  </View>
                </View>
                <Text style={styles.rankTotal}>{(item.total ?? 0).toLocaleString()}</Text>
              </View>
              {index < filtered.length - 1 && <View style={styles.separator} />}
            </View>
          )}
          ListEmptyComponent={!loading ? <Text style={styles.errorText}>{error || "No rankings found"}</Text> : null}
        />

        <Modal visible={cityOpen} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setCityOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select City</Text>
            <FlatList
              data={CITIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setCity(item); setCityOpen(false); }}
                  style={styles.cityOption}
                >
                  <Text style={styles.cityOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16 },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  centeredHeader: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center" },
  endsBadge: {
    backgroundColor: colors.greenDeep + "15",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.greenDeep + "30",
    alignSelf: 'center',
  },
  endsBadgeText: { fontSize: 12, color: colors.greenDeep, fontWeight: "700" },
  tabsRow: { marginTop: 16 },
  tabGroup: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: "center", 
    borderRadius: 10 
  },
  tabActive: {
    backgroundColor: colors.greenDeep + "15",
    borderWidth: 1,
    borderColor: colors.greenDeep,
    elevation: 0,
  },
  tabText: { fontSize: 14, color: colors.textMuted, fontWeight: "700" },
  tabTextActive: { color: colors.greenDeep },
  segScroll: { marginTop: 12 },
  segGroup: { flexDirection: "row", gap: 8 },
  segBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segActive: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft },
  segText: { color: colors.text, fontWeight: "600", fontSize: 12 },
  segTextActive: { color: "#000" },
  citySelect: { 
    marginTop: 12, 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 10, 
    padding: 12, 
    backgroundColor: colors.bg 
  },
  citySelectText: { color: colors.text, fontWeight: "500", textAlign: "center" },
  podiumCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 20, textAlign: 'center' },
  medalsRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 10 },
  medalCard: {
    flex: 1,
    maxWidth: 100,
    alignItems: "center",
    padding: 10,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  medalFirst: { 
    borderColor: colors.goldSoft, 
    borderWidth: 2, 
    backgroundColor: colors.card,
    paddingBottom: 20,
    transform: [{ scale: 1.05 }],
  },
  medalChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
    marginBottom: 4,
  },
  medalChipText: { fontSize: 12, fontWeight: "800", color: colors.text },
  medalName: { fontSize: 11, fontWeight: "700", color: colors.text, marginTop: 4, textAlign: 'center' },
  medalCity: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  medalTotal: { fontSize: 13, fontWeight: "800", marginTop: 4 },
  searchRow: { marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.card,
    color: colors.text,
  },
  listCardItem: { backgroundColor: colors.card, paddingHorizontal: 16 },
  rankRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  rankLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rankNumber: { fontWeight: "800", width: 30, fontSize: 16 },
  rankName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rankCity: { fontSize: 12, color: colors.textMuted },
  rankTotal: { fontWeight: "800", color: colors.greenDeep, fontSize: 15 },
  separator: { height: 1, backgroundColor: colors.borderLight, opacity: 0.5 },
  yourBlock: {
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.goldSoft + "15",
    borderWidth: 1,
    borderColor: colors.goldSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notesCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  notesTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  note: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  footerPadding: { paddingBottom: 40 },
  footerText: { textAlign: "center", color: colors.textMuted, fontSize: 12 },
  errorText: { color: colors.danger, textAlign: "center", padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "60%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 15, color: colors.text },
  cityOption: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  cityOptionText: { fontSize: 16, color: colors.text },
  smallMuted: { fontSize: 11, color: colors.textMuted },
  listHeaderContainer: { marginBottom: 8 }
});