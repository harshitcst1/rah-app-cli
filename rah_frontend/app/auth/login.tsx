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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../theme";
import { api } from "../services/api";
import { useAuth } from "../context/auth";

export default function Login() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { setUser } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // OTP State
  const [loginId, setLoginId] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState("");
  const [showOtpVerify, setShowOtpVerify] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [expiryText, setExpiryText] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Timers
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!otpPhone.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }
    setLoading(true);
    try {
      const data = await api.loginStart(otpPhone);
      if (data.ok && data.login_id) {
        setLoginId(data.login_id);
        setMaskedPhone(otpPhone.replace(/\d(?=\d{4})/g, "•"));
        setShowOtpVerify(true);
        setExpiryText("Expires in 5:00");
        setResendCooldown(60);
        Alert.alert("Success", "OTP sent to your WhatsApp");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit OTP");
      return;
    }
    if (!loginId) {
      Alert.alert("Error", "Session expired. Please request a new OTP");
      return;
    }
    setLoading(true);
    try {
      const data = await api.loginVerify(loginId, otpCode);
      if (data.ok && data.token && data.user) {
        setUser(data.user);
        // Router navigation handled by AuthProvider
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !loginId) return;
    try {
      await api.loginResend(loginId);
      Alert.alert("Success", "A new OTP has been sent");
      setResendCooldown(60);
      setExpiryText("Expires in 5:00");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to resend OTP");
    }
  };

  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter phone and password");
      return;
    }
    setLoading(true);
    try {
      const data = await api.loginPassword(identifier, password);
      if (data.ok && data.token && data.user) {
        setUser(data.user);
        // Router navigation handled by AuthProvider
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Log In</Text>
            <Text style={styles.subtitle}>
              OTP first. You can also use password.
            </Text>
          </View>

          {!showOtpVerify ? (
            // Step 1: Phone Input
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone (WhatsApp)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 9xxxxxxxxx"
                  placeholderTextColor="rgba(6,77,41,0.4)"
                  value={otpPhone}
                  onChangeText={setOtpPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <Text style={styles.hint}>We'll send an OTP on WhatsApp.</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Step 2: OTP Verification
            <View style={styles.form}>
              <Text style={styles.otpTitle}>Enter OTP</Text>
              <Text style={styles.otpSubtitle}>
                OTP sent to {maskedPhone}. {expiryText}
              </Text>
              
              <View style={styles.otpInputRow}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="______"
                  placeholderTextColor="rgba(6,77,41,0.3)"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[styles.verifyButton, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.resendRow}>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendCooldown > 0}
                >
                  <Text
                    style={[
                      styles.resendText,
                      resendCooldown > 0 && styles.resendTextDisabled,
                    ]}
                  >
                    Resend OTP
                  </Text>
                </TouchableOpacity>
                {resendCooldown > 0 && (
                  <Text style={styles.cooldownText}>
                    Resend available in {resendCooldown}s
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Password Login */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          >
            <Text style={styles.toggleText}>Log in with password</Text>
            <Text style={styles.toggleAction}>
              {showPasswordForm ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={styles.passwordForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email or Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com or +91 9xxxxxxxxx"
                  placeholderTextColor="rgba(6,77,41,0.4)"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(6,77,41,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handlePasswordLogin}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "Logging in..." : "Log In with Password"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>No account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}> 
              <Text style={styles.linkText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Footer */}
        <View style={styles.bottomFooter}>
          <Text style={styles.bottomFooterText}>© 2026 Rah e Noor</Text>
          <Text style={styles.bottomFooterText}>
            Developed & Created by{" "}
            <Text style={styles.footerLink}>CanStart Technologies</Text>
          </Text>
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
    padding: 32,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.greenDeep,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.greenDeep,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  primaryButton: {
    backgroundColor: colors.green,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: 14,
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
    marginBottom: 16,
  },
  otpInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 8,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  verifyButton: {
    backgroundColor: colors.green,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: "center",
  },
  verifyButtonText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: "600",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    color: colors.green,
    textDecorationLine: "underline",
  },
  resendTextDisabled: {
    color: colors.textMuted,
    textDecorationLine: "none",
  },
  cooldownText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  toggleButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.greenDeep,
  },
  toggleAction: {
    fontSize: 12,
    color: colors.textMuted,
  },
  passwordForm: {
    marginTop: 16,
    gap: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: "500",
  },
  bottomFooter: {
    alignItems: "center",
    paddingVertical: 32,
  },
  bottomFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 4,
  },
  footerLink: {
    fontWeight: "500",
    color: colors.green,
    textDecorationLine: "underline",
  },
});
