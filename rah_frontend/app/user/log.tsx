import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../theme";
import { api } from "../services/api";
import { emit } from "../utils/pubsub";

export default function Log() {
  const { colors } = useTheme();
  type DaroodType = { id: number; name: string; short_desc?: string };

  const fallbackTypes: DaroodType[] = useMemo(
    () => [
      { id: 1, name: "Darood Ibrahimi", short_desc: "Commonly recited in Salah" },
      { id: 2, name: "Darood Tunjina", short_desc: "Prayer for relief and success" },
      { id: 3, name: "Darood-e-Taj", short_desc: "A well-known salawat" },
      { id: 4, name: "Simple Salawat", short_desc: "Allahumma salli 'ala Muhammad" },
    ],
    []
  );

  const [types, setTypes] = useState<DaroodType[]>(fallbackTypes);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [selected, setSelected] = useState<DaroodType | null>(null);
  const [counterVisible, setCounterVisible] = useState(false);

  const [count, setCount] = useState(0);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualCount, setManualCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  // Safe haptic/vibration helper: prefer `react-native-haptic-feedback` when
  // available (better on modern iPhones), otherwise fall back to Vibration API.
  function triggerHaptic() {
    try {
      // Use dynamic require so the app still runs if the optional lib isn't installed
       
      const haptic = require('react-native-haptic-feedback');
      const impl = haptic && (haptic.default || haptic);
      impl && impl.trigger && impl.trigger('impactLight');
    } catch (err) {
      // If the optional native lib is not available, fall back to Vibration
      console.warn('haptic helper error', err);
      Vibration.vibrate();
    }
  }

  async function loadTypes() {
    setLoadingTypes(true);
    try {
      const data = await api.getDaroodTypes();
      if (data?.ok && Array.isArray(data.types) && data.types.length > 0) {
        setTypes(data.types);
      }
    } catch {
      // Keep fallback list
    } finally {
      setLoadingTypes(false);
    }
  }

  function startCounter() {
    if (!selected) return;
    setCount(0);
    setCounterVisible(true);
  }

  function changeDarood() {
    setSelected(null);
    setCounterVisible(false);
    setCount(0);
  }

  function adjustCount(next: number) {
    const clamped = Math.max(0, Math.min(999999, next));
    setCount(clamped);
  }

  async function submitLog(payload: { darood_type_id: number; count: number; source: "tap" | "manual" }) {
    const data = await api.createLog(payload.darood_type_id, payload.count, payload.source);
    if (!data?.ok) throw new Error("Submit failed");
    return data;
  }

  async function handleConfirmSubmit() {
    if (!selected) return;
    if (count < 1) {
      Alert.alert("Invalid count", "Count must be at least 1.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLog({ darood_type_id: selected.id, count, source: "tap" });
      setConfirmVisible(false);
      setCount(0);
      emit("darood:logged", { darood_type_id: selected.id, count, source: "tap" });
      Alert.alert("Success", "Logged successfully.");
    } catch {
      Alert.alert("Error", "Could not log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualSubmit() {
    if (!selected) return;
    const value = parseInt(manualCount || "0", 10);
    if (!Number.isFinite(value) || value < 1) {
      Alert.alert("Invalid count", "Enter a valid count.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLog({ darood_type_id: selected.id, count: value, source: "manual" });
      setManualVisible(false);
      setCount(0);
      setManualCount("");
      emit("darood:logged", { darood_type_id: selected.id, count: value, source: "manual" });
      Alert.alert("Success", "Logged successfully.");
    } catch {
      Alert.alert("Error", "Could not log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Select the Darood</Text>
          <Text style={styles.subtitle}>Choose what you are reciting now.</Text>

          {loadingTypes ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.green} />
              <Text style={styles.loadingText}>Loading options...</Text>
            </View>
          ) : (
            <View style={styles.optionsList}>
              {types.map((item) => {
                const active = selected?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                    onPress={() => setSelected(item)}
                  >
                    <View style={styles.radioOuter}>
                      {active ? <View style={styles.radioInner} /> : null}
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionTitle}>{item.name}</Text>
                      {!!item.short_desc && <Text style={styles.optionSub}>{item.short_desc}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, !selected && styles.primaryButtonDisabled]}
            onPress={startCounter}
            disabled={!selected}
          >
            <Text style={styles.primaryButtonText}>Start counter</Text>
          </TouchableOpacity>
        </View>

        {counterVisible && selected ? (
          <View style={styles.card}>
            <View style={styles.counterHeader}>
              <View style={styles.counterChipWrap}>
                <Text style={styles.counterChip}>{selected.name}</Text>
                <Text style={styles.counterHint}>Focus on sincerity.</Text>
              </View>
              <TouchableOpacity onPress={changeDarood}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.counterDisplay}>
              <Text style={styles.counterLabel}>Session count</Text>
              <Text style={styles.counterValue}>{count}</Text>
            </View>

            <TouchableOpacity
              style={styles.tapButton}
              onPress={() => {
                triggerHaptic();
                adjustCount(count + 1);
              }}
            >
              <Text style={styles.tapButtonText}>Tap to count</Text>
            </TouchableOpacity>

            <View style={styles.counterControls}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => adjustCount(count - 1)}>
                <Text style={styles.counterBtnText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.counterBtn} onPress={() => adjustCount(0)}>
                <Text style={styles.counterBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.counterBtn} onPress={() => adjustCount(count + 1)}>
                <Text style={styles.counterBtnText}>+1</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionStack}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setConfirmVisible(true)}>
                <Text style={styles.primaryButtonText}>Submit session</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setManualVisible(true)}>
                <Text style={styles.linkButton}>Manually log instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.pledge}>
          <Text style={styles.pledgeTitle}>Honesty pledge</Text>
          <Text style={styles.pledgeText}>Log only what you genuinely recite. Integrity matters more than numbers.</Text>
        </View>
      </ScrollView>

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm submission</Text>
            <Text style={styles.modalSub}>Please confirm your genuine recitations.</Text>
            <View style={styles.modalSummary}>
              <Text style={styles.modalSummaryLeft}>{selected?.name || "Darood"}</Text>
              <Text style={styles.modalSummaryRight}>{count}</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmSubmit} disabled={submitting}>
                <Text style={styles.modalConfirmText}>{submitting ? "Submitting..." : "Yes, submit"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={manualVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manual log</Text>
            <Text style={styles.modalSub}>Enter the count you genuinely recited.</Text>

            <Text style={styles.modalLabel}>Count</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 100"
              keyboardType="number-pad"
              value={manualCount}
              onChangeText={setManualCount}
            />

            <View style={styles.modalNote}>
              <Text style={styles.modalNoteTitle}>Integrity reminder</Text>
              <Text style={styles.modalNoteText}>Speak the truth and log honestly. Consistency and sincerity are the goal.</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setManualVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleManualSubmit} disabled={submitting}>
                <Text style={styles.modalConfirmText}>{submitting ? "Submitting..." : "Submit"}</Text>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.green,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.green,
  },
  optionsList: {
    marginTop: 12,
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  optionCardActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldTint,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  optionSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  counterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterChipWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterChip: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
  },
  counterHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  changeLink: {
    fontSize: 12,
    color: colors.green,
    textDecorationLine: "underline",
  },
  counterDisplay: {
    marginTop: 20,
    alignItems: "center",
  },
  counterLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  counterValue: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  tapButton: {
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 22,
    alignItems: "center",
  },
  tapButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.green,
  },
  counterControls: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  counterBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    alignItems: "center",
  },
  counterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.green,
  },
  actionStack: {
    marginTop: 16,
    gap: 8,
  },
  linkButton: {
    textAlign: "center",
    color: colors.green,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  pledge: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pledgeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  pledgeText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  modalSummary: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.goldTint,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalSummaryLeft: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  modalSummaryRight: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  modalActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.green,
    fontWeight: "600",
  },
  modalConfirm: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.green,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalConfirmText: {
    color: colors.onAccent,
    fontWeight: "700",
  },
  modalLabel: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
  },
  modalInput: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  modalNote: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.goldTint,
    padding: 10,
  },
  modalNoteTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  modalNoteText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
