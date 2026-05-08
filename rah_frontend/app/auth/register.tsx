import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../theme";
import { api } from "../services/api";
import { useAuth } from "../context/auth";

export default function Register() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { setUser } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("Rajkot");
  const [agreed, setAgreed] = useState(false);

  // OTP / registration flow state
  const [stepOtp, setStepOtp] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [expiresText, setExpiresText] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  // timers
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const startExpiryCountdown = (seconds: number) => {
    let left = seconds;
    setExpiresText(`Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
    const iv = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(iv);
        setExpiresText('Code expired. You can resend a new code.');
        return;
      }
      setExpiresText(`Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(iv);
  };

  const handleStart = async () => {
    if (!name.trim() || !phone.trim() || !password) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!agreed) {
      Alert.alert('Error', 'Please confirm the declaration');
      return;
    }
    setLoading(true);
    try {
      const data = await api.registerStart({ name, phone, password, city: city || undefined });
      if (data.ok && data.registration_id) {
        setRegistrationId(data.registration_id);
        setMaskedPhone(phone.replace(/\d(?=\d{4})/g, '•'));
        setStepOtp(true);
        setResendCooldown(60);
        startExpiryCountdown(300);
        Alert.alert('Success', 'OTP sent to your WhatsApp');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!/^[0-9]{6}$/.test(otpValue)) {
      Alert.alert('Error', 'Enter the 6-digit OTP');
      return;
    }
    if (!registrationId) {
      Alert.alert('Error', 'Session expired');
      return;
    }
    setLoading(true);
    try {
      const data = await api.registerComplete(registrationId, otpValue);
      if (data.ok && data.token && data.user) {
        setUser(data.user);
        Alert.alert('Success', 'Registration complete! Welcome to Rah-e-Noor.');
        // Router navigation handled by AuthProvider
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !registrationId) return;
    try {
      await api.registerResend(registrationId);
      setResendCooldown(60);
      startExpiryCountdown(300);
      Alert.alert('Success', 'A new OTP has been sent');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Set up your profile to start logging.</Text>
          </View>

          {!stepOtp ? (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone (WhatsApp)</Text>
                <TextInput style={styles.input} placeholder="+91 9xxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Text style={styles.hint}>Used for pilot verification only.</Text>
              </View>

              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Confirm</Text>
                  <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City (Pilot)</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} />
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity onPress={() => setAgreed(!agreed)} style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Text style={styles.checkboxTick}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>I confirm entries will reflect genuine recitation only.</Text>
              </View>

              <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleStart} disabled={loading}>
                <Text style={styles.primaryButtonText}>{loading ? 'Please wait…' : 'Register'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.otpTitle}>Verify OTP</Text>
              <Text style={styles.otpSubtitle}>We sent an OTP to {maskedPhone}. {expiresText}</Text>
              <View style={styles.otpRow}>
                <TextInput style={styles.otpInput} placeholder="______" placeholderTextColor="rgba(6,77,41,0.3)" value={otpValue} onChangeText={setOtpValue} keyboardType="number-pad" maxLength={6} />
                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={loading}>
                  <Text style={styles.verifyBtnText}>Verify</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.resendRow}>
                <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
                  <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>Resend OTP</Text>
                </TouchableOpacity>
                {resendCooldown > 0 && <Text style={styles.cooldownText}>Resend available in {resendCooldown}s</Text>}
              </View>
            </View>
          )}

          <View style={styles.loginPrompt}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.linkText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomFooter}>
          <Text style={styles.bottomFooterText}>© {new Date().getFullYear()} Rah e Noor</Text>
          <Text style={styles.bottomFooterText}>Developed & Created by <Text style={styles.footerLink}>CanStart Technologies</Text></Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(200,158,65,0.3)",
    padding: 24,
    marginBottom: 24,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.greenDeep,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.greenDeep,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  rowTwo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(200,158,65,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkboxTick: {
    color: colors.white,
    fontWeight: "700",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.greenDeep,
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 8,
    backgroundColor: colors.inputBg,
    color: colors.text,
  },
  verifyBtn: {
    backgroundColor: colors.green,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  verifyBtnText: {
    color: colors.onAccent,
    fontWeight: "600",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  resendText: {
    color: colors.green,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  resendTextDisabled: {
    color: colors.textMuted,
    textDecorationLine: "none",
  },
  cooldownText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: colors.green,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.greenDeep,
    textDecorationLine: "underline",
    marginLeft: 6,
  },
  bottomFooter: {
    alignItems: "center",
    paddingVertical: 24,
  },
  bottomFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
  footerLink: {
    color: colors.green,
    fontWeight: "600",
  },
});
