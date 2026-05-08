import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Vibration,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../theme";
import { api } from "../services/api";
import { Storage } from "../utils/storage";
import { useAuth } from "../context/auth";
import { on } from "../utils/pubsub";
import { useIsFocused } from "@react-navigation/native";
import { showToast } from "../components/Toast";
import Toast from "../components/Toast";

type LastLog = { id?: string; count?: number; at?: string } | null;
type WeekSeriesItem = { total: number };

type AnnouncementItem = {
  id: number;
  subject: string;
  description: string;
  photo_url?: string | null;
  is_read: boolean;
  published_at?: string;
};

export default function UserDashboard() {
  const { colors } = useTheme();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<{ name?: string; city?: string } | null>(authUser);
  const userCityRef = useRef<string | undefined>(authUser?.city);
  const [refreshing, setRefreshing] = useState(false);
  const [streakCurrent, setStreakCurrent] = useState<number>(0);
  const [streakLongest, setStreakLongest] = useState<number>(0);

  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [todayGoal, setTodayGoal] = useState<number>(1000);
  const [weekSeries, setWeekSeries] = useState<WeekSeriesItem[]>(Array.from({ length: 7 }, () => ({ total: 0 })));
  const [lastLog, setLastLog] = useState<LastLog>(null);

  const [seasonEnds, setSeasonEnds] = useState<string | null>(null);
  const [seasonYourTotal, setSeasonYourTotal] = useState<number>(0);
  const [seasonProgressPct, setSeasonProgressPct] = useState<number>(0);

  const [lbItems, setLbItems] = useState<any[]>([]);
  const [lbYour, setLbYour] = useState<any | null>(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbScope, setLbScope] = useState<"city" | "global">("city");

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementUnreadCount, setAnnouncementUnreadCount] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [allAnnouncementsVisible, setAllAnnouncementsVisible] = useState(false);

  const [logInput, setLogInput] = useState<string>("");
  const [undoing, setUndoing] = useState(false);

  const loadStreak = useCallback(async () => {
    try {
      const data = await api.getStreak();
      setStreakCurrent(data.current ?? 0);
      setStreakLongest(data.longest ?? 0);
    } catch (error) {
      console.warn("streak error", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getTodayWeekStats();
      const today = data.today_total ?? 0;
      const goal = data.goal && data.goal > 0 ? data.goal : 1000;
      setTodayTotal(today);
      setTodayGoal(goal);
      if (Array.isArray(data.week_series)) setWeekSeries(data.week_series.map((x: any) => ({ total: x.total ?? 0 })));
      setLastLog(data.last_log || null);
    } catch (error) {
      console.warn("stats error", error);
    }
  }, []);

  const loadProfileSummary = useCallback(async () => {
    try {
      const cachedUser = await Storage.getUser();
      if (cachedUser) setUser(cachedUser);
    } catch (error) {
      console.warn("profile summary error", error);
    }
  }, []);

  const loadSeason = useCallback(async () => {
    try {
      const data = await api.getSeason();
      setSeasonEnds(data.ends_in_days > 0 ? `${data.ends_in_days} days` : "today");
      setSeasonYourTotal(data.your_total ?? 0);
      setSeasonProgressPct(typeof data.progress_pct === "number" ? data.progress_pct : 0);
    } catch (error) {
      console.warn("season error", error);
    }
  }, []);

  const loadLeaderboardPreview = useCallback(async (scopeParam?: "city" | "global") => {
    const scopeToUse = scopeParam ?? lbScope;
    setLbLoading(true);
    try {
      const data = await api.getLeaderboard(
        scopeToUse,
        "season",
        scopeToUse === "city" ? userCityRef.current : undefined,
      );
      if (data?.ok) {
        setLbItems(Array.isArray(data.items) ? data.items : []);
        setLbYour(data.your_rank || null);
      }
    } catch (error) {
      console.warn("lb preview error", error);
      setLbItems([]);
      setLbYour(null);
    } finally {
      setLbLoading(false);
    }
  }, [lbScope]);

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementLoading(true);
    try {
      const data = await api.getAnnouncements();
      if (data?.ok) {
        setAnnouncements(Array.isArray(data.items) ? data.items : []);
        setAnnouncementUnreadCount(data.unread_count ?? 0);
      }
    } catch (error) {
      console.warn("announcement load error", error);
    } finally {
      setAnnouncementLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      loadProfileSummary(),
      loadStreak(),
      loadStats(),
      loadSeason(),
      loadAnnouncements(),
    ]);
    await loadLeaderboardPreview();
  }, [loadAnnouncements, loadLeaderboardPreview, loadProfileSummary, loadSeason, loadStats, loadStreak]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    userCityRef.current = user?.city;
  }, [user?.city]);

  useEffect(() => {
    if (authUser && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setUser(authUser);
      loadData();
    }
    const unsub = on("darood:logged", async () => {
      await Promise.all([loadStats(), loadStreak(), loadLeaderboardPreview()]);
    });
    return () => { unsub(); };
  }, [authUser, loadAnnouncements, loadData, loadLeaderboardPreview, loadStats, loadStreak]);

  function relTime(iso?: string) {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    const units: [string, number][] = [
      ["y", 31536000],
      ["mo", 2592000],
      ["d", 86400],
      ["h", 3600],
      ["m", 60],
      ["s", 1],
    ];
    for (const [u, s] of units) {
      const v = Math.floor(diff / s);
      if (v >= 1) return `${v}${u} ago`;
    }
    return "just now";
  }

  function undoLast() {
    if (!lastLog?.id) return;
    Alert.alert("Confirm", "Undo the last log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Undo",
        onPress: async () => {
          setUndoing(true);
          try {
            await api.deleteLog(lastLog.id!);
            await loadStats();
            await loadStreak();
          } catch (e: any) {
            console.warn("undo error", e);
            showToast(e.message || "Could not undo. Please try again.", "error");
          } finally {
            setUndoing(false);
          }
        },
      },
    ]);
  }

  const openAnnouncement = async (announcement: AnnouncementItem) => {
    setSelectedAnnouncement(announcement);
    setAnnouncementModalVisible(true);

    if (!announcement.is_read) {
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === announcement.id ? { ...item, is_read: true } : item)),
      );
      setAnnouncementUnreadCount((count) => Math.max(0, count - 1));
      try {
        await api.markAnnouncementRead(announcement.id);
      } catch (error) {
        console.warn("mark announcement read error", error);
      }
    }
  };

  

  async function handleLogNow() {
    const v = Number(logInput || 0);
    if (!v || v <= 0) return;
    Vibration.vibrate(10);
    try {
      await api.createLog(1, v, "manual");
      setLogInput("");
      await Promise.all([loadStats(), loadStreak(), loadLeaderboardPreview()]);
    } catch (e: any) {
      showToast(e.message || "Failed to log", "error");
    }
  }


  const weekNodes = useMemo(() => weekSeries.map((w) => w.total), [weekSeries]);

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && initialLoadDone.current) {
      loadData();
    }
  }, [isFocused, loadData]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={colors.green}
          />
        }
      >
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.smallMuted}>Assalamu Alaikum,</Text>
              <Text style={styles.name}>{user?.name ?? ""}</Text>
              <Text style={styles.smallMuted}>{user?.city ?? ""} • Keep intention pure.</Text>
            </View>
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonText}>Season: 1447 AH</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Text>🔥</Text>
              </View>
              <View>
                <Text style={styles.smallMuted}>Daily streak</Text>
                <Text style={styles.statBig}>{streakCurrent} days</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.smallMuted}>Longest streak</Text>
              <Text style={styles.statBig}>{streakLongest} days</Text>
            </View>
          </View>
          <View style={styles.rowBetweenSmall}>
            <Text style={styles.smallMuted}>Don’t break the chain.</Text>
            <View style={styles.toggleStatic}>
              <Text style={styles.smallMuted}>Daily reminder</Text>
              <View style={styles.toggleInner} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Announcements</Text>
              <Text style={styles.smallMuted}>Admin updates for everyone</Text>
            </View>
            <View style={styles.announcementBadge}>
              <Text style={styles.announcementBadgeText}>{announcementUnreadCount} unread</Text>
            </View>
          </View>

          {announcementLoading ? (
            <View style={styles.announcementLoadingRow}>
              <ActivityIndicator size="small" color={colors.green} />
              <Text style={styles.smallMuted}>Loading announcements...</Text>
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.announcementEmptyCard}>
              <Text style={styles.smallMuted}>No announcements yet.</Text>
            </View>
          ) : (
            <View style={styles.announcementList}>
              {announcements.slice(0, 3).map((announcement) => (
                <TouchableOpacity
                  key={announcement.id}
                  style={[styles.announcementItem, !announcement.is_read && styles.announcementItemUnread]}
                  onPress={() => openAnnouncement(announcement)}
                  activeOpacity={0.85}
                >
                  <View style={styles.announcementItemTop}>
                    <View style={{ flex: 1 }}>
                      {!announcement.is_read ? (
                        <View style={styles.newAnnouncementBadge}>
                          <Text style={styles.newAnnouncementBadgeText}>NEW</Text>
                        </View>
                      ) : null}
                      <Text style={styles.announcementItemTitle} numberOfLines={1}>
                        {announcement.subject}
                      </Text>
                      <Text style={styles.announcementItemText} numberOfLines={2}>
                        {announcement.description}
                      </Text>
                    </View>
                    {announcement.photo_url ? (
                      <Image source={{ uri: announcement.photo_url }} style={styles.announcementThumb} />
                    ) : null}
                  </View>
                  <View style={styles.announcementItemBottom}>
                    <Text style={styles.smallMuted}>
                      {announcement.published_at ? relTime(announcement.published_at) : "Just now"}
                    </Text>
                    {!announcement.is_read ? <View style={styles.unreadDot} /> : null}
                  </View>
                </TouchableOpacity>
              ))}
              {announcements.length > 3 ? (
                <TouchableOpacity
                  style={styles.readMoreButton}
                  onPress={() => setAllAnnouncementsVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.readMoreButtonText}>Read more</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Log your darood today</Text>
          <Text style={styles.smallMuted}>Be honest. Log only what you recite.</Text>

          <View style={styles.progressRow}>
            <Text style={styles.smallMuted}>Today</Text>
            <Text style={styles.statMedium}>{todayTotal.toLocaleString()} / {todayGoal.toLocaleString()}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.round((todayTotal / todayGoal) * 100))}%` as const }]} />
          </View>

          <View style={styles.logRow}>
            <TextInput keyboardType="numeric" placeholder="Enter count" value={logInput} onChangeText={setLogInput} style={styles.input} />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogNow}>
              <Text style={styles.primaryBtnText}>Log now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowBetweenSmall}>
            <TouchableOpacity onPress={undoLast} disabled={!lastLog || undoing}>
              <Text style={[styles.linkText, !lastLog && styles.linkDisabled]}>Undo last log</Text>
            </TouchableOpacity>
            <Text style={styles.smallMuted}>{lastLog ? `Last log: ${lastLog.count} added • ${relTime(lastLog.at)}` : 'No logs yet today'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>This week</Text>
            <Text style={styles.smallMuted}>Sun — Sat</Text>
          </View>
          <View style={styles.weekRow}>
            {weekNodes.map((v, i) => {
              const todayIndex = new Date().getDay();
              const isToday = i === todayIndex;
              const isCompletedToday = isToday && todayTotal > 0;
              const isMissingToday = isToday && todayTotal <= 0;

              return (
                <View key={i} style={styles.weekCol}>
                  <Text style={styles.weekLabel}>{['S','M','T','W','T','F','S'][i]}</Text>
                  <View
                    style={[
                      styles.weekDot,
                      isCompletedToday && styles.weekDotCompleted,
                      isMissingToday && styles.weekDotMissing,
                    ]}
                  >
                    {isCompletedToday ? (
                      <Text style={styles.weekMark}>✓</Text>
                    ) : isMissingToday ? (
                      <Text style={styles.weekMark}>✕</Text>
                    ) : (
                      <Text style={styles.weekValue}>{v}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <Text style={styles.smallMuted}>Umrah Sponsorship</Text>
          </View>
          <View style={styles.inlineTabs}>
            <TouchableOpacity
              onPress={async () => { setLbScope("city"); await loadLeaderboardPreview("city"); }}
              activeOpacity={0.8}
              style={[styles.tabPill, lbScope === "city" && styles.tabActivePill]}
            >
              <Text style={[styles.tabText, lbScope === "city" && styles.tabActiveText]}>City</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => { setLbScope("global"); await loadLeaderboardPreview("global"); }}
              activeOpacity={0.8}
              style={[styles.tabPill, lbScope === "global" && styles.tabActivePill]}
            >
              <Text style={[styles.tabText, lbScope === "global" && styles.tabActiveText]}>Global</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            {lbLoading ? <ActivityIndicator /> : (
              lbItems.slice(0,3).map((r, idx) => (
                <View key={idx} style={styles.rankItem}>
                  <View style={styles.rankLeftSmall}>
                    <View style={styles.rankNumCircle}>
                      <Text style={styles.rankNum}>{r.rank}</Text>
                    </View>
                    <View>
                      <Text style={styles.rankName}>{r.user?.name ?? 'User'}</Text>
                      {r.user?.city ? <Text style={styles.smallMuted}>{r.user.city}</Text> : null}
                    </View>
                  </View>
                  <Text style={styles.rankTotal}>{(r.total ?? 0).toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>

          {lbYour ? (
            <View style={styles.yourBlock}>
              <View style={styles.rankLeftSmall}>
                <View style={styles.rankNumCircle}>
                  <Text style={styles.rankNum}>{lbYour.rank}</Text>
                </View>
                <View>
                  <Text style={styles.rankName}>{lbYour.user?.name ?? 'You'}</Text>
                  {lbYour.user?.city ? <Text style={styles.smallMuted}>{lbYour.user.city}</Text> : null}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.rankTotal}>{(lbYour.total ?? 0).toLocaleString()}</Text>
                <Text style={styles.smallMuted}>Your position</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Season progress</Text>
              <Text style={styles.smallMuted}>Ends in {seasonEnds ?? '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.smallMuted}>Your total</Text>
              <Text style={styles.statBig}>{seasonYourTotal.toLocaleString()}</Text>
            </View>
          </View>
          <View style={[styles.progressBarBg, { marginTop: 8 }]}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, seasonProgressPct))}%` as const }]} />
          </View>
          <Text style={[styles.smallMuted, { marginTop: 8 }]}>Keep steady. Genuine recitation only.</Text>
        </View>

        <View style={styles.cardAlt}>
          <Text style={styles.sectionTitle}>Honesty pledge</Text>
          <Text style={styles.smallMuted}>Log only what you actually recite. Your discipline matters more than numbers.</Text>
        </View>

      </ScrollView>

      <Modal visible={announcementModalVisible} transparent animationType="fade" onRequestClose={() => setAnnouncementModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.announcementModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.announcementModalTitle}>{selectedAnnouncement?.subject}</Text>
              {selectedAnnouncement?.photo_url ? (
                <TouchableOpacity onPress={() => setPhotoModalVisible(true)} activeOpacity={0.9}>
                  <Image source={{ uri: selectedAnnouncement.photo_url }} style={styles.announcementModalImage} />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.announcementModalText}>{selectedAnnouncement?.description}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.announcementModalClose} onPress={() => setAnnouncementModalVisible(false)}>
              <Text style={styles.announcementModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
        <View style={styles.photoModalBackdrop}>
          <TouchableOpacity style={styles.photoModalCloseArea} onPress={() => setPhotoModalVisible(false)} activeOpacity={1}>
            {selectedAnnouncement?.photo_url ? (
              <Image source={{ uri: selectedAnnouncement.photo_url }} style={styles.photoModalImage} resizeMode="contain" />
            ) : null}
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={allAnnouncementsVisible} transparent animationType="fade" onRequestClose={() => setAllAnnouncementsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.allAnnouncementsModalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.announcementModalTitle}>All Announcements</Text>
              <TouchableOpacity onPress={() => setAllAnnouncementsVisible(false)}>
                <Text style={styles.announcementModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 4 }}>
              {announcements.length === 0 ? (
                <Text style={styles.smallMuted}>No announcements yet.</Text>
              ) : (
                announcements.map((announcement) => (
                  <TouchableOpacity
                    key={announcement.id}
                    style={[styles.announcementItem, !announcement.is_read && styles.announcementItemUnread]}
                    onPress={() => {
                      setAllAnnouncementsVisible(false);
                      openAnnouncement(announcement);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.announcementItemTop}>
                      <View style={{ flex: 1 }}>
                        {!announcement.is_read ? (
                          <View style={styles.newAnnouncementBadge}>
                            <Text style={styles.newAnnouncementBadgeText}>NEW</Text>
                          </View>
                        ) : null}
                        <Text style={styles.announcementItemTitle} numberOfLines={1}>
                          {announcement.subject}
                        </Text>
                        <Text style={styles.announcementItemText} numberOfLines={2}>
                          {announcement.description}
                        </Text>
                      </View>
                      {announcement.photo_url ? (
                        <Image source={{ uri: announcement.photo_url }} style={styles.announcementThumb} />
                      ) : null}
                    </View>
                    <View style={styles.announcementItemBottom}>
                      <Text style={styles.smallMuted}>
                        {announcement.published_at ? relTime(announcement.published_at) : "Just now"}
                      </Text>
                      {!announcement.is_read ? <View style={styles.unreadDot} /> : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 96 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  cardAlt: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 32 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetweenSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLeftSmall: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallMuted: { color: colors.textMuted, fontSize: 12 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  seasonBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card },
  seasonText: { color: colors.textSecondary, fontSize: 11 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center' },
  statBig: { fontSize: 18, fontWeight: '700', color: colors.text },
  statMedium: { fontSize: 14, fontWeight: '600', color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
  progressBarBg: { height: 8, borderRadius: 8, backgroundColor: colors.borderLight, overflow: 'hidden', marginTop: 8 },
  progressBarFill: { height: 8, backgroundColor: colors.gold, borderRadius: 8 },
  logRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: colors.inputBg, color: colors.text },
  primaryBtn: { backgroundColor: colors.green, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: colors.onAccent, fontWeight: '700' },
  linkText: { color: colors.green, textDecorationLine: 'underline' },
  linkDisabled: { color: colors.textMuted, textDecorationLine: 'none' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  weekCol: { alignItems: 'center' },
  weekLabel: { fontSize: 10, color: colors.textMuted },
  weekDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight, backgroundColor: '#EBD9A9' },
  weekDotCompleted: { backgroundColor: colors.green, borderColor: colors.green },
  weekDotMissing: { backgroundColor: '#FDE8E8', borderColor: '#EF4444', borderStyle: 'dashed' },
  weekValue: { fontSize: 11, color: colors.text },
  weekMark: { fontSize: 12, fontWeight: '800', color: colors.onAccent },
  announcementBadge: { backgroundColor: colors.goldSoft || '#FFF5E5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  announcementBadgeText: { fontSize: 11, fontWeight: '700', color: colors.green },
  announcementLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  announcementEmptyCard: { paddingVertical: 8 },
  announcementList: { marginTop: 8 },
  announcementItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  announcementItemUnread: {
    backgroundColor: colors.greenTint || '#F1FBF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.green,
    paddingHorizontal: 10,
    paddingTop: 10,
    marginBottom: 8,
  },
  announcementItemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  announcementItemTitle: { fontWeight: '700', color: colors.text },
  announcementItemText: { color: colors.text, marginTop: 4 },
  announcementThumb: { width: 60, height: 48, borderRadius: 8 },
  announcementItemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, marginLeft: 8 },
  readMoreButton: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  readMoreButtonText: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  newAnnouncementBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  newAnnouncementBadgeText: {
    color: colors.onAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  announcementModalCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, maxHeight: '80%' },
  allAnnouncementsModalCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, maxHeight: '85%' },
  announcementModalTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
  announcementModalImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 12 },
  announcementModalText: { color: colors.text, lineHeight: 20 },
  announcementModalClose: { marginTop: 12, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8 },
  announcementModalCloseText: { color: colors.green, fontWeight: '700' },
  photoModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  photoModalCloseArea: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  photoModalImage: { width: '100%', height: '100%' },
  inlineTabs: { flexDirection: 'row', marginTop: 12, gap: 8 },
  tabPill: { backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  tabActivePill: { backgroundColor: colors.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tabText: { color: colors.text },
  tabActiveText: { color: colors.onAccent, fontWeight: '700' },
  rankItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rankLeftSmall: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankNumCircle: { 
    width: 36, 
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.green,
  },
  rankNum: { 
    fontWeight: '800', 
    fontSize: 14,
    color: colors.green,
  },
  rankName: { fontWeight: '700', color: colors.text, fontSize: 14 },
  rankTotal: { fontWeight: '700', color: colors.green, fontSize: 16 },
  yourBlock: { 
    marginTop: 12, 
    borderRadius: 10, 
    padding: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.goldTint, 
    borderWidth: 2, 
    borderColor: colors.gold,
  },
  toggleStatic: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleInner: { width: 32, height: 18, borderRadius: 9, backgroundColor: colors.gold },
});
