import { useCallback, useEffect, useMemo, useState } from "react";
/* eslint-disable react-native/no-inline-styles */
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../theme";
import { api } from "../services/api";
import { useAuth } from "../context/auth";
import { launchImageLibrary } from "react-native-image-picker";

interface KpiData {
  total_users: number;
  active_today: number;
  total_darood: number;
  top_performer: { name: string; total: number } | null;
}

interface LeaderboardItem {
  rank: number;
  total: number;
  user: { id: number; name: string; city: string };
}

interface ActivityItem {
  count: number;
  created_at: string;
  user: { name: string; city: string };
}

interface AnnouncementItem {
  id: number;
  subject: string;
  description: string;
  photo_url?: string | null;
  is_active: boolean;
  published_at?: string;
}

interface DaroodType {
  id: number;
  name: string;
  short_desc?: string;
  active: boolean;
  sort_order: number;
  has_text: boolean;
  has_image: boolean;
}

export default function AdminDashboard() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [daroodTypes, setDaroodTypes] = useState<DaroodType[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<DaroodType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeOrder, setTypeOrder] = useState("0");
  const [typeActive, setTypeActive] = useState(true);
  const [typeText, setTypeText] = useState("");
  const [saving, setSaving] = useState(false);

  // Announcement form state
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementPhoto, setAnnouncementPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [kpiRes, lbRes, actRes, typesRes, announcementRes] = await Promise.all([
        api.getAdminKpis(),
        api.getAdminLeaderboard('season'),
        api.getAdminActivity(8),
        api.getAdminDaroodTypes(),
        api.getAdminAnnouncements(),
      ]);
      
      if (kpiRes.ok) setKpis(kpiRes);
      if (lbRes.ok) setLeaderboard(lbRes.items || []);
      if (actRes.ok) setActivity(actRes.items || []);
      if (typesRes.ok) setDaroodTypes(typesRes.items || []);
      if (announcementRes.ok) setAnnouncements(announcementRes.items || []);
    } catch (error: any) {
      if (error?.message === "Session expired. Please login again.") {
        await signOut();
        return;
      }

      console.error("Admin dashboard error:", error);
      Alert.alert("Error", "Failed to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  const relativeTime = (iso: string) => {
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const days = Math.floor(h / 24);
    return days + "d ago";
  };

  const openCreateModal = () => {
    setEditingType(null);
    setTypeName("");
    setTypeDesc("");
    setTypeOrder("0");
    setTypeActive(true);
    setTypeText("");
    setModalVisible(true);
  };

  const openEditModal = (type: DaroodType) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeDesc(type.short_desc || "");
    setTypeOrder(String(type.sort_order));
    setTypeActive(type.active);
    setTypeText("");
    setModalVisible(true);
  };

  const pickAnnouncementPhoto = async () => {
    const pickerFn = typeof launchImageLibrary === 'function' ? launchImageLibrary : null;

    if (!pickerFn) {
      Alert.alert(
        'Image picker not available',
        'The native image picker module is not available. Did you install and rebuild the app? Run `npx react-native run-android` and try again.',
      );
      return;
    }

    try {
      const result = await pickerFn({ mediaType: 'photo', selectionLimit: 1, includeBase64: true });
      if (!result || result.didCancel || result.errorCode || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset?.uri) return;

      // Prefer a data URI when available (helps with iOS `ph://` URIs).
      const name = asset.fileName || `announcement-${Date.now()}.jpg`;
      const type = asset.type || 'image/jpeg';
      const uri = asset.base64 ? `data:${type};base64,${asset.base64}` : asset.uri;

      setAnnouncementPhoto({
        uri,
        name,
        type,
      });
    } catch (err: any) {
      console.warn('pickAnnouncementPhoto error', err);
      Alert.alert('Error', err?.message || 'Failed to pick photo');
    }
  };

  const clearAnnouncementForm = () => {
    setAnnouncementSubject("");
    setAnnouncementDescription("");
    setAnnouncementPhoto(null);
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementSubject.trim() || !announcementDescription.trim()) {
      Alert.alert("Error", "Subject and description are required");
      return;
    }

    setAnnouncementSaving(true);
    try {
      console.log('Uploading announcement', { announcementSubject, announcementPhoto });
      await api.createAdminAnnouncement({
        subject: announcementSubject.trim(),
        description: announcementDescription.trim(),
        photo: announcementPhoto,
      });
      clearAnnouncementForm();
      await loadData();
      Alert.alert("Success", "Announcement published to all users.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to publish announcement");
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const handleDeleteAnnouncement = (announcement: AnnouncementItem) => {
    Alert.alert(
      "Delete Announcement",
      `Delete "${announcement.subject}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAdminAnnouncement(announcement.id);
              await loadData();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete announcement");
            }
          },
        },
      ],
    );
  };

  const handleSaveType = async () => {
    if (!typeName.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    
    setSaving(true);
    try {
      if (editingType) {
        await api.updateAdminDaroodType(editingType.id, {
          name: typeName.trim(),
          short_desc: typeDesc.trim() || undefined,
          active: typeActive,
          sort_order: parseInt(typeOrder, 10) || 0,
          content_text: typeText || undefined,
        });
      } else {
        await api.createAdminDaroodType({
          name: typeName.trim(),
          short_desc: typeDesc.trim() || undefined,
          active: typeActive,
          sort_order: parseInt(typeOrder, 10) || 0,
          content_text: typeText || undefined,
        });
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading admin data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView 
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Info */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.pageTitle}>Admin Dashboard</Text>
              <Text style={styles.pageSubtitle}>
                Track users, recitation progress and Umrah sponsorship leaderboard.
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Season: 1447 AH</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Region: India</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Pilot: Rajkot</Text>
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{formatNumber(kpis?.total_users || 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Today</Text>
            <Text style={styles.statValue}>{formatNumber(kpis?.active_today || 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Darood Logged</Text>
            <Text style={styles.statValue}>{formatNumber(kpis?.total_darood || 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Top Performer</Text>
            <Text style={styles.statValueSmall}>{kpis?.top_performer?.name || "—"}</Text>
            <Text style={styles.statNote}>{formatNumber(kpis?.top_performer?.total || 0)} darood</Text>
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Leaderboard (Umrah Sponsorship)</Text>
            <Text style={styles.sectionNote}>Season ranking</Text>
          </View>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Rank</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>City</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Total</Text>
            </View>
            {/* Table Body */}
            {leaderboard.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>
                  No entries yet
                </Text>
              </View>
            ) : (
              leaderboard.slice(0, 10).map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellBold, { flex: 0.8 }]}>
                    {item.rank}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{item.user?.name || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.user?.city || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {item.total.toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
          <Text style={styles.sectionFooterNote}>
            Top 3 get special recognition; #1 receives Umrah sponsorship.
          </Text>
        </View>

        {/* Darood Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Darood Types</Text>
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Text style={styles.addButtonText}>+ New Type</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Active</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Order</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Actions</Text>
            </View>
            {/* Table Body */}
            {daroodTypes.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>
                  No darood types found
                </Text>
              </View>
            ) : (
              daroodTypes.map((type) => (
                <View key={type.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellBold, { flex: 2 }]}>
                    {type.name}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.statusBadge, type.active ? styles.activeBadge : styles.inactiveBadge]}>
                      <Text style={[styles.statusText, type.active ? styles.activeText : styles.inactiveText]}>
                        {type.active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{type.sort_order}</Text>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => openEditModal(type)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={styles.activityGrid}>
            {activity.length === 0 ? (
              <View style={styles.activityCard}>
                <Text style={styles.activityText}>No activity yet</Text>
              </View>
            ) : (
              activity.map((item, idx) => (
                <View
                  key={`${item.created_at}-${item.user?.name || "user"}-${item.count}-${idx}`}
                  style={styles.activityCard}
                >
                  <Text style={styles.activityText}>
                    <Text style={styles.activityBold}>{item.user?.name || "—"}</Text> logged{" "}
                    <Text style={styles.activityBold}>{item.count.toLocaleString()}</Text> darood
                  </Text>
                  <Text style={styles.activityTime}>
                    {relativeTime(item.created_at)} • {item.user?.city || "—"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Announcements</Text>
              <Text style={styles.sectionNote}>Publish to all users instantly</Text>
            </View>
            <View style={styles.announcementBadge}>
              <Text style={styles.announcementBadgeText}>{announcements.length} total</Text>
            </View>
          </View>
          <View style={styles.announcementFormCard}>
            <Text style={styles.formSectionTitle}>Create Announcement</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.modalInput}
                value={announcementSubject}
                onChangeText={setAnnouncementSubject}
                placeholder="Enter announcement subject"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea, { minHeight: 110 }]}
                value={announcementDescription}
                onChangeText={setAnnouncementDescription}
                placeholder="Write the announcement details"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Photo</Text>
              <TouchableOpacity style={styles.photoPickerButton} onPress={pickAnnouncementPhoto}>
                <Text style={styles.photoPickerText}>{announcementPhoto ? "Change photo" : "Select photo"}</Text>
              </TouchableOpacity>
              {announcementPhoto ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: announcementPhoto.uri }} style={styles.photoPreview} />
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.publishButton, announcementSaving && styles.buttonDisabled]}
              onPress={handleSaveAnnouncement}
              disabled={announcementSaving}
            >
              <Text style={styles.publishButtonText}>{announcementSaving ? "Publishing..." : "Publish Announcement"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentAnnouncementHeader}>
            <Text style={styles.formSectionTitle}>Recent Announcements</Text>
          </View>

          {announcements.length === 0 ? (
            <View style={styles.announcementCard}>
              <Text style={styles.announcementText}>No announcements yet.</Text>
            </View>
          ) : (
            announcements.slice(0, 5).map((announcement) => (
              <View key={announcement.id} style={styles.announcementCard}>
                <View style={styles.announcementRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.announcementTitle}>{announcement.subject}</Text>
                    <Text style={styles.announcementText} numberOfLines={2}>
                      {announcement.description}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.deleteAnnouncementBtn} onPress={() => handleDeleteAnnouncement(announcement)}>
                    <Text style={styles.deleteAnnouncementText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                {announcement.photo_url ? (
                  <Image source={{ uri: announcement.photo_url }} style={styles.recentAnnouncementPhoto} />
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Rah e Noor</Text>
          <Text style={styles.footerText}>
            Developed & Created by{" "}
            <Text style={styles.footerLink}>CanStart Technologies</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Create/Edit Darood Type Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingType ? "Edit Darood Type" : "Create Darood Type"}
            </Text>
            
            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={typeName}
                  onChangeText={setTypeName}
                  placeholder="Enter name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Short Description</Text>
                <TextInput
                  style={styles.modalInput}
                  value={typeDesc}
                  onChangeText={setTypeDesc}
                  placeholder="Optional"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Sort Order</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={typeOrder}
                    onChangeText={setTypeOrder}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.checkboxRow} 
                  onPress={() => setTypeActive(!typeActive)}
                >
                  <View style={[styles.checkbox, typeActive && styles.checkboxChecked]}>
                    {typeActive && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Active</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Darood Text</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  value={typeText}
                  onChangeText={setTypeText}
                  placeholder="Optional Arabic/transliteration/translation"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSaveType}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : editingType ? "Save" : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 20,
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.greenDeep,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    color: colors.greenDeep,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.greenDeep,
    marginTop: 8,
  },
  statValueSmall: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.greenDeep,
    marginTop: 8,
  },
  statNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.cardGlass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.greenDeep,
  },
  sectionNote: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sectionFooterNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
  },
  filterRow: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  table: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.greenDeep,
    backgroundColor: colors.goldTint,
  },
  tableCell: {
    fontSize: 13,
    color: colors.greenDeep,
  },
  tableCellBold: {
    fontWeight: "700",
  },
  tableCellSmall: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityGrid: {
    gap: 12,
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  activityText: {
    fontSize: 13,
    color: colors.greenDeep,
  },
  activityBold: {
    fontWeight: "700",
  },
  activityTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  announcementCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 12,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.greenDeep,
  },
  announcementBadge: {
    backgroundColor: colors.goldSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  announcementBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.greenDeep,
  },
  photoPickerButton: {
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  photoPickerText: {
    color: colors.greenDeep,
    fontWeight: "700",
  },
  photoPreviewWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoPreview: {
    width: "100%",
    height: 180,
  },
  publishButton: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  publishButtonText: {
    color: colors.onAccent,
    fontWeight: "800",
  },
  recentAnnouncementHeader: {
    marginTop: 8,
    marginBottom: 4,
  },
  announcementRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  deleteAnnouncementBtn: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteAnnouncementText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 12,
  },
  recentAnnouncementPhoto: {
    marginTop: 10,
    width: "100%",
    height: 140,
    borderRadius: 12,
  },
  announcementFormCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.greenDeep,
  },
  announcementText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  footerLink: {
    fontWeight: "700",
    color: colors.green,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.greenDeep,
    marginBottom: 16,
  },
  modalCloseButton: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: "700",
  },
  // New styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.greenDeep,
  },
  addButton: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onAccent,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  inactiveBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  activeText: {
    color: "#10B981",
  },
  inactiveText: {
    color: "#EF4444",
  },
  editLink: {
    fontSize: 13,
    color: colors.green,
    textDecorationLine: "underline",
  },
  modalForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkmark: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.greenDeep,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.greenDeep,
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onAccent,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

