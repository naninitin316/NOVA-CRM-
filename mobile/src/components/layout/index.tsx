import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography, roleLabels, roleColors, shadows } from '../theme';
import { RootState } from '../store';
import { useLogout } from '../hooks/useApi';

interface SidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  collapsed?: boolean;
}

const navItems = [
  { key: 'Dashboard', icon: 'grid-outline' as const, label: 'Dashboard' },
  { key: 'Tasks', icon: 'checkbox-outline' as const, label: 'Tasks' },
  { key: 'Progress', icon: 'bar-chart-outline' as const, label: 'Progress' },
  { key: 'Settings', icon: 'settings-outline' as const, label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeRoute, onNavigate, collapsed }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const logout = useLogout();

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoIcon}>
          <Ionicons name="diamond" size={24} color={colors.white} />
        </View>
        {!collapsed && <Text style={styles.logoText}>Nova CRM</Text>}
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = activeRoute === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              {!collapsed && (
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User section */}
      <View style={styles.userSection}>
        {!collapsed && user && (
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.userRole}>{roleLabels[user.role]}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          {!collapsed && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface TopBarProps {
  title: string;
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onSearch, searchValue }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.topBar}>
      <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>{title}</Text>

      <View style={styles.topBarRight}>
        {onSearch && !isMobile && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={colors.textMuted}
              value={searchValue}
              onChangeText={onSearch}
            />
          </View>
        )}

        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>

        {user && (
          <View style={styles.profileSection}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{user.name.charAt(0)}</Text>
            </View>
            {!isMobile && (
              <View>
                <Text style={styles.profileName}>{user.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: `${roleColors[user.role]}20` }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColors[user.role] }]}>
                    {roleLabels[user.role]}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.backgroundLight,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 20,
    justifyContent: 'space-between',
    ...Platform.select({ web: { height: '100vh' as unknown as number } }),
  },
  sidebarCollapsed: { width: 72 },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { ...typography.h4, color: colors.text },
  nav: { flex: 1, paddingHorizontal: 12 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: { backgroundColor: `${colors.primary}15` },
  navLabel: { ...typography.body, color: colors.textSecondary },
  navLabelActive: { color: colors.primary, fontWeight: '600' },
  userSection: { paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  userDetails: { flex: 1 },
  userName: { ...typography.label, color: colors.text },
  userRole: { ...typography.caption, color: colors.textMuted },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8 },
  logoutText: { color: colors.error, fontWeight: '500' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  pageTitle: { ...typography.h3, color: colors.text },
  pageTitleMobile: { fontSize: 18 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    width: 260,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, outlineStyle: 'none' as 'solid' },
  notificationBtn: { position: 'relative', padding: 4 },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { color: colors.white, fontWeight: '600' },
  profileName: { ...typography.label, color: colors.text },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
});
