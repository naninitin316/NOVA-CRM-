import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, borderRadius, typography } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  style,
}) => {
  const variantStyles = {
    primary: { bg: colors.primary, text: colors.white, border: colors.primary },
    secondary: { bg: colors.surfaceLight, text: colors.text, border: colors.border },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    danger: { bg: colors.error, text: colors.white, border: colors.error },
    ghost: { bg: 'transparent', text: colors.textSecondary, border: 'transparent' },
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 15 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 16 },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon}
          <Text style={[styles.buttonText, { color: v.text, fontSize: s.fontSize }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, style, ...props }) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
      {icon && <View style={styles.inputIcon}>{icon}</View>}
      <TextInput
        style={[styles.input, icon ? styles.inputWithIcon : null, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.card, style]}
    >
      {children}
    </Wrapper>
  );
};

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, color = colors.primary, bgColor }) => (
  <View style={[styles.badge, { backgroundColor: bgColor || `${color}20` }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, color, icon }) => (
  <Card style={styles.statCard}>
    <View style={styles.statHeader}>
      {icon && (
        <View style={[styles.statIcon, { backgroundColor: `${color || colors.primary}20` }]}>
          {icon}
        </View>
      )}
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </Card>
);

export const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

export const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontWeight: '600' },
  inputContainer: { marginBottom: 16 },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: { borderColor: colors.error },
  inputIcon: { paddingLeft: 14 },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  inputWithIcon: { paddingLeft: 8 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  statCard: { flex: 1, minWidth: 150 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: { ...typography.caption, color: colors.textSecondary },
  statValue: { ...typography.h2, color: colors.text },
  statSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: { color: colors.textSecondary, marginTop: 12 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyTitle: { ...typography.h4, color: colors.textSecondary },
  emptySubtitle: { ...typography.bodySmall, color: colors.textMuted, marginTop: 8 },
});
