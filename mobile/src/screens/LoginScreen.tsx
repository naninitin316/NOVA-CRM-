import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { colors, borderRadius, typography } from '../theme';
import { Button, Input } from '../components/ui';
import { useLogin } from '../hooks/useApi';
import { LoginCredentials } from '../types';

export const LoginScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const login = useLogin();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginCredentials>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginCredentials) => {
    login.mutate({ ...data, rememberMe });
  };

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }, isWide && styles.contentWide]}>
          {/* Left branding panel */}
          {isWide && (
            <View style={styles.brandPanel}>
              <LinearGradient
                colors={colors.gradient.primary}
                style={styles.brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.brandContent}>
                  <View style={styles.brandLogo}>
                    <Ionicons name="diamond" size={48} color={colors.white} />
                  </View>
                  <Text style={styles.brandTitle}>Nova CRM</Text>
                  <Text style={styles.brandSubtitle}>
                    Enterprise-grade customer relationship management for modern teams
                  </Text>
                  <View style={styles.featureList}>
                    {['Task Management', 'Team Analytics', 'Role-based Access'].map((f) => (
                      <View key={f} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Login form */}
          <View style={[styles.formPanel, isWide && styles.formPanelWide]}>
            {!isWide && (
              <View style={styles.mobileLogo}>
                <View style={styles.mobileLogoIcon}>
                  <Ionicons name="diamond" size={28} color={colors.white} />
                </View>
                <Text style={styles.mobileLogoText}>Nova CRM</Text>
              </View>
            )}

            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.signInText}>Sign in to your account</Text>

            {login.isError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorBannerText}>
                  {(login.error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                    'Login failed. Please try again.'}
                </Text>
              </View>
            )}

            <Controller
              control={control}
              name="email"
              rules={{ required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@company.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  icon={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{ required: 'Password is required' }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={!showPassword}
                  error={errors.password?.message}
                  icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
                />
              )}
            />

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={login.isPending}
              size="lg"
              style={styles.signInBtn}
            />

            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Demo Accounts</Text>
              <Text style={styles.demoText}>admin@crm.com · sales@crm.com · hr@crm.com</Text>
              <Text style={styles.demoText}>Password: password123</Text>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { width: '100%', maxWidth: 440, padding: 24 },
  contentWide: { flexDirection: 'row', maxWidth: 960, gap: 0 },
  brandPanel: { flex: 1, borderRadius: borderRadius.xl, overflow: 'hidden' },
  brandGradient: { flex: 1, padding: 48, justifyContent: 'center' },
  brandContent: { gap: 16 },
  brandLogo: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandTitle: { fontSize: 36, fontWeight: '700', color: colors.white },
  brandSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 24 },
  featureList: { marginTop: 24, gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: colors.white, fontSize: 15 },
  formPanel: { padding: 32 },
  formPanelWide: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
  },
  mobileLogo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  mobileLogoIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLogoText: { ...typography.h2, color: colors.text },
  welcomeText: { ...typography.h2, color: colors.text, marginBottom: 4 },
  signInText: { ...typography.body, color: colors.textSecondary, marginBottom: 32 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorLight,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  errorBannerText: { color: colors.error, flex: 1, fontSize: 14 },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -8,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { color: colors.textSecondary, fontSize: 14 },
  forgotText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  signInBtn: { marginBottom: 24 },
  demoSection: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  demoTitle: { ...typography.label, color: colors.textSecondary, marginBottom: 4 },
  demoText: { ...typography.caption, color: colors.textMuted },
});
