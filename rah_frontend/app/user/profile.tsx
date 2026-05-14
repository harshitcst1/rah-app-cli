import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { launchImageLibrary } from "react-native-image-picker";
import { useTheme, type ThemeColors } from "../theme";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { api as apiClient } from "../services/api";
import { Storage } from "../utils/storage";
import { useAuth } from "../context/auth";
import { showToast } from "../components/Toast";
import Toast from "../components/Toast";

export default function Profile() {
  const navigation = useNavigation<any>();
  const { colors, mode, setMode } = useTheme();
  const { signOut } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const defaultPhoneMasked = "+91 •••• ••21";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

      // Fetch fresh profile data from API to get latest profile_image
      const profileData = await apiClient.getProfile();
      if (profileData?.ok && profileData.user) {
        setName(profileData.user.name ?? "");
        setCity(profileData.user.city ?? "");
        setDailyGoal((profileData.user.daily_goal ?? 1000).toString());
        setPreferredMode(profileData.user.preferred_mode === "manual" ? "manual" : "tap");
        setPrivacyInitials(!!profileData.user.privacy_show_initials);
        setPrivacyCity(!!profileData.user.privacy_show_city);
        setPhoneMasked(profileData.user.phone_masked ?? defaultPhoneMasked);
        setPhoneVerified(!!profileData.user.phone_verified);
        if (profileData.user.profile_image) {
          setProfileImageUri(profileData.user.profile_image);
        }
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
      showToast("Profile saved successfully", "success");
    } catch (e: any) {
      showToast(e.message || "Could not save profile. Please try again.", "error");
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
      showToast("Account deleted.", "success");
    } catch {
      showToast("Could not delete account.", "error");
    }
  }

  async function pickAndUploadImage() {
    launchImageLibrary(
      { mediaType: "photo", quality: 0.7, maxWidth: 600, maxHeight: 600 },
      async (response) => {
        if (response.didCancel || response.errorCode || !response.assets?.[0]) return;
        
        const asset = response.assets[0];
        if (!asset.uri) return;

        setUploadingImage(true);
        try {
          const formData = new FormData();
          const filename = asset.fileName || `profile_${Date.now()}.jpg`;
          formData.append("profile_image", {
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: filename,
          } as any);

          const result = await apiClient.request<{ ok: boolean; profile_image?: string }>(
            "/profile/image",
            {
              method: "POST",
              body: formData,
            }
          );

          if (result.ok && result.profile_image) {
            setProfileImageUri(result.profile_image);
            showToast("Profile image updated!", "success");
            // Refresh profile to get updated data
            const profileData = await apiClient.getProfile();
            if (profileData?.ok && profileData.user?.profile_image) {
              setProfileImageUri(profileData.user.profile_image);
            }
          } else {
            showToast("Could not upload image", "error");
          }
        } catch (error: any) {
          showToast(error.message || "Could not upload image", "error");
        } finally {
          setUploadingImage(false);
        }
      }
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(name || "").trim().charAt(0).toUpperCase() || "U"}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.uploadBtn} 
              onPress={pickAndUploadImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Text style={styles.uploadBtnIcon}>📷</Text>
              )}
            </TouchableOpacity>
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
                  <View style={styles.themeBtnIcon}>
 <Icon 
    name={
      m === "system" ? "settings" : 
      m === "light" ? "wb-sunny" : "nights-stay"
    } 
    size={20} 
    color={mode === m ? colors.green : colors.textMuted} 
  />
  
</View>
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
      <Toast />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 50 },
  header: { alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 20, backgroundColor: colors.greenTint, borderWidth: 2, borderColor: colors.green, alignItems: "center", justifyContent: "center", marginBottom: 0 },
  profileImage: { width: 80, height: 80, borderRadius: 20, borderWidth: 2, borderColor: colors.green },
  uploadBtn: { position: "absolute", bottom: -2, right: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card },
  uploadBtnIcon: { fontSize: 16 },
  avatarText: { color: colors.green, fontSize: 32, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 6 },

  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 10, letterSpacing: 0.3 },

  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardLite: { backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.borderLight },

  label: { fontSize: 12, fontWeight: "600", color: colors.green, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: colors.text },

  rowTwo: { flexDirection: "row", gap: 10, marginTop: 10 },
  modeBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderLight, padding: 12, alignItems: "center", backgroundColor: colors.card },
  modeBtnActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 2 },
  modeText: { color: colors.textMuted, fontWeight: "600", fontSize: 14 },
  modeTextActive: { color: colors.text, fontWeight: "700" },

  saveBtn: { marginTop: 16, backgroundColor: colors.green, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: colors.onAccent, fontWeight: "700", fontSize: 15 },

  notifyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  notifyTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  notifySub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  infoValue: { fontSize: 14, fontWeight: "600", color: colors.green },

  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, fontSize: 12, fontWeight: "600", backgroundColor: colors.greenTint, color: colors.green },
  chipVerified: { backgroundColor: colors.greenTint, color: colors.green },
  chipUnverified: { backgroundColor: colors.dangerBg, color: colors.danger },

  accountBtns: { flexDirection: "row", marginTop: 16, gap: 10 },
  outlineBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderLight, paddingVertical: 12, alignItems: "center", backgroundColor: colors.card },
  outlineBtnText: { color: colors.green, fontWeight: "700", fontSize: 14 },
  dangerBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: colors.dangerBg, borderWidth: 1.5, borderColor: colors.danger },
  dangerBtnText: { color: colors.danger, fontWeight: "700", fontSize: 14 },

  pledge: { marginTop: 20, backgroundColor: colors.goldTint, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.gold },
  pledgeTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  pledgeSub: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 18 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalSub: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 18 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderLight },
  modalCancelText: { color: colors.green, fontWeight: "700", fontSize: 14 },
  modalConfirm: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.green, alignItems: "center" },
  modalConfirmText: { color: colors.onAccent, fontWeight: "800", fontSize: 14 },

  themeBtnRow: { flexDirection: "row", gap: 10 },
  themeBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card },
  themeBtnActive: { borderColor: colors.gold, borderWidth: 2, backgroundColor: colors.goldTint },
  themeBtnIcon: { fontSize: 24, marginBottom: 6 },
  themeBtnLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  themeBtnLabelActive: { color: colors.text, fontWeight: "700" },
});
