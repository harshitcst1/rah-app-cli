import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useTheme, type ThemeColors } from "../theme";
import { api as apiClient } from "../services/api";
import { Storage } from "../utils/storage";
import { useAuth } from "../context/auth";

export default function Profile() {
  const navigation = useNavigation<any>();
  const { colors, mode, setMode } = useTheme();
  const { signOut } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const defaultPhoneMasked = "+91 •••• ••21";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [dailyGoal, setDailyGoal] = useState<string>("1000");
  const [preferredMode, setPreferredMode] = useState<"tap" | "manual">("tap");

  const [notifDaily, setNotifDaily] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);

  const [privacyInitials, setPrivacyInitials] = useState(false);
  const [privacyCity, setPrivacyCity] = useState(true);

  const [phoneMasked, setPhoneMasked] = useState(defaultPhoneMasked);
  const [phoneVerified, setPhoneVerified] = useState(true);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const cachedUser = await Storage.getUser();
      if (cachedUser) {
        setName(cachedUser.name ?? "");
        setCity(cachedUser.city ?? "");
        setDailyGoal((cachedUser.daily_goal ?? 1000).toString());
        setPreferredMode(cachedUser.preferred_mode === "manual" ? "manual" : "tap");
        setPrivacyInitials(!!cachedUser.privacy_show_initials);
        setPrivacyCity(!!cachedUser.privacy_show_city);
        setPhoneMasked(cachedUser.phone_masked ?? defaultPhoneMasked);
        setPhoneVerified(!!cachedUser.phone_verified);
      }
    } catch {
      // ignore; keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveProfile() {
    setSaving(true);
    try {
      const payload = {
        name: (name || "").trim(),
        city: (city || "").trim() || null,
        daily_goal: Math.max(1, parseInt(dailyGoal || "1000", 10)),
        preferred_mode: preferredMode,
        privacy_show_initials: privacyInitials,
        privacy_show_city: privacyCity,
      };
      await apiClient.updateProfile(payload);
      Alert.alert("Saved", "Profile saved successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLogoutModalVisible(false);
    try {
      await signOut();
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        }),
      );
    } catch (e) {
      console.warn("Logout error", e);
    }
  }

  async function handleDeleteAccount() {
    setDeleteModalVisible(false);
    try {
      await apiClient.request('/account', { method: 'DELETE' });
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Register" }],
        }),
      );
      await signOut();
      Alert.alert("Deleted", "Account deleted.");
    } catch {
      Alert.alert("Error", "Could not delete account.");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || "").trim().charAt(0).toUpperCase() || "U"}</Text>
          </View>
          <Text style={styles.name}>{name || "User"}</Text>
          <Text style={styles.email}>{phoneMasked}</Text>
        </View>

        {/* Theme mode selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.cardLite}>
            <View style={styles.themeBtnRow}>
              {(["system", "light", "dark"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.themeBtn, mode === m && styles.themeBtnActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={styles.themeBtnIcon}>
                    {m === "system" ? "⚙️" : m === "light" ? "☀️" : "🌙"}
                  </Text>
                  <Text style={[styles.themeBtnLabel, mode === m && styles.themeBtnLabelActive]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" style={styles.input} />

            <Text style={[styles.label, { marginTop: 12 }]}>City</Text>
            <TextInput value={city} onChangeText={setCity} placeholder="City" style={styles.input} />

            <Text style={[styles.label, { marginTop: 12 }]}>Daily goal</Text>
            <TextInput value={dailyGoal} onChangeText={setDailyGoal} keyboardType="number-pad" style={[styles.input, { width: 140 }]} />

            <Text style={[styles.label, { marginTop: 12 }]}>Preferred logging</Text>
            <View style={styles.rowTwo}>
              <TouchableOpacity style={[styles.modeBtn, preferredMode === "tap" && styles.modeBtnActive]} onPress={() => setPreferredMode("tap")}>              
                <Text style={[styles.modeText, preferredMode === "tap" && styles.modeTextActive]}>Tap counter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeBtn, preferredMode === "manual" && styles.modeBtnActive]} onPress={() => setPreferredMode("manual")}>              
                <Text style={[styles.modeText, preferredMode === "manual" && styles.modeTextActive]}>Manual entry</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save changes"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.cardLite}>
            <View style={styles.notifyRow}>
              <View>
                <Text style={styles.notifyTitle}>Daily reminder</Text>
                <Text style={styles.notifySub}>Evening nudge to log today’s darood</Text>
              </View>
              <Switch value={notifDaily} onValueChange={setNotifDaily} trackColor={{ true: colors.gold }} thumbColor={notifDaily ? colors.green : colors.white} />
            </View>

            <View style={styles.notifyRow}>
              <View>
                <Text style={styles.notifyTitle}>Weekly summary</Text>
                <Text style={styles.notifySub}>Progress for the past 7 days</Text>
              </View>
              <Switch value={notifWeekly} onValueChange={setNotifWeekly} trackColor={{ true: colors.gold }} thumbColor={notifWeekly ? colors.green : colors.white} />
            </View>

            <View style={styles.notifyRow}>
              <View>
                <Text style={styles.notifyTitle}>Announcements</Text>
                <Text style={styles.notifySub}>Important updates from admins</Text>
              </View>
              <Switch value={notifAnnouncements} onValueChange={setNotifAnnouncements} trackColor={{ true: colors.gold }} thumbColor={notifAnnouncements ? colors.green : colors.white} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.cardLite}>
            <View style={styles.notifyRow}>
              <View>
                <Text style={styles.notifyTitle}>Hide my full name on leaderboards</Text>
                <Text style={styles.notifySub}>Show initials only (e.g., A. Shaikh)</Text>
              </View>
              <Switch value={privacyInitials} onValueChange={setPrivacyInitials} trackColor={{ true: colors.gold }} thumbColor={privacyInitials ? colors.green : colors.white} />
            </View>

            <View style={styles.notifyRow}>
              <View>
                <Text style={styles.notifyTitle}>Show my city</Text>
                <Text style={styles.notifySub}>Helps with city leaderboards</Text>
              </View>
              <Switch value={privacyCity} onValueChange={setPrivacyCity} trackColor={{ true: colors.gold }} thumbColor={privacyCity ? colors.green : colors.white} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{phoneMasked}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.chip, phoneVerified ? styles.chipVerified : styles.chipUnverified]}>{phoneVerified ? "Verified" : "Unverified"}</Text>
            </View>

            <View style={styles.accountBtns}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setLogoutModalVisible(true)}>
                <Text style={styles.outlineBtnText}>Log out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={() => setDeleteModalVisible(true)}>
                <Text style={styles.dangerBtnText}>Delete account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.pledge}>
          <Text style={styles.pledgeTitle}>Honesty pledge</Text>
          <Text style={styles.pledgeSub}>Log only what you genuinely recite. Integrity matters more than numbers.</Text>
        </View>
      </ScrollView>

      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalSub}>You can log back in anytime.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleLogout}>
                <Text style={styles.modalConfirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalSub}>This action is permanent. Make dua and be sure.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: "#c53030" }]} onPress={handleDeleteAccount}>
                <Text style={styles.modalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 18 },
  avatar: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { color: colors.green, fontSize: 28, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  email: { fontSize: 13, color: colors.green, marginTop: 4 },

  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },

  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardLite: { backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.borderLight },

  label: { fontSize: 13, fontWeight: "600", color: colors.green, marginBottom: 6 },
  input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: colors.text },

  rowTwo: { flexDirection: "row", gap: 8, marginTop: 8 },
  modeBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, padding: 10, alignItems: "center", backgroundColor: colors.card },
  modeBtnActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  modeText: { color: colors.green, fontWeight: "600" },
  modeTextActive: { color: colors.text },

  saveBtn: { marginTop: 14, backgroundColor: colors.green, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  saveBtnText: { color: colors.onAccent, fontWeight: "700" },

  notifyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  notifyTitle: { fontSize: 14, fontWeight: "600", color: colors.green },
  notifySub: { fontSize: 12, color: colors.textMuted },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  infoLabel: { fontSize: 14, fontWeight: "600", color: colors.green },
  infoValue: { fontSize: 14, color: colors.greenDeep },

  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, fontSize: 12, backgroundColor: colors.card },
  chipVerified: { backgroundColor: colors.card },
  chipUnverified: { backgroundColor: colors.dangerBg, color: colors.danger },

  accountBtns: { flexDirection: "row", marginTop: 12, gap: 8 },
  outlineBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, paddingVertical: 10, alignItems: "center", backgroundColor: colors.card },
  outlineBtnText: { color: colors.green, fontWeight: "600" },
  dangerBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder },
  dangerBtnText: { color: colors.danger, fontWeight: "700" },

  pledge: { marginTop: 10, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  pledgeTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  pledgeSub: { fontSize: 12, color: colors.textMuted, marginTop: 6 },

  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  modalSub: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
  modalCancelText: { color: colors.green, fontWeight: "700" },
  modalConfirm: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.green, alignItems: "center" },
  modalConfirmText: { color: colors.onAccent, fontWeight: "800" },

  themeBtnRow: { flexDirection: "row", gap: 10 },
  themeBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card },
  themeBtnActive: { borderColor: colors.gold, backgroundColor: colors.goldTint },
  themeBtnIcon: { fontSize: 22, marginBottom: 4 },
  themeBtnLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  themeBtnLabelActive: { color: colors.text, fontWeight: "700" },
});
