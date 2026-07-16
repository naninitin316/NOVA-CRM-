import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useSelector, useDispatch } from 'react-redux';
import { colors, borderRadius, typography, roleLabels, roleColors } from '../theme';
import { Button, Input, Card, Badge } from '../components/ui';
import {
  useUpdateProfile,
  useChangePassword,
  useUsers,
  useCreateUser,
  useDeleteUser,
} from '../hooks/useApi';
import { RootState } from '../store';
import { setTheme, toggleNotification } from '../store/settingsSlice';
import { User, Role } from '../types';

export const SettingsScreen: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'admin'>('profile');
  const [showUserModal, setShowUserModal] = useState(false);

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const profileForm = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const userForm = useForm({
    defaultValues: { name: '', email: '', password: '', role: 'CONTRIBUTOR' as Role, department: '' },
  });

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: 'person-outline' as const },
    { key: 'system' as const, label: 'System', icon: 'cog-outline' as const },
    ...(isAdmin ? [{ key: 'admin' as const, label: 'Admin', icon: 'shield-outline' as const }] : []),
  ];

  const onProfileSubmit = (data: { name: string; email: string; phone: string }) => {
    updateProfile.mutate(data, {
      onSuccess: () => Alert.alert('Success', 'Profile updated successfully'),
    });
  };

  const onPasswordSubmit = (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Password changed successfully');
          passwordForm.reset();
        },
        onError: () => Alert.alert('Error', 'Failed to change password'),
      }
    );
  };

  const onCreateUser = (data: { name: string; email: string; password: string; role: Role; department: string }) => {
    createUser.mutate(data, {
      onSuccess: () => { setShowUserModal(false); userForm.reset(); },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab navigation */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Settings</Text>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.avatarName}>{user?.name}</Text>
              <Badge label={roleLabels[user?.role || 'SALES_TEAM']} color={roleColors[user?.role || 'SALES_TEAM']} />
            </View>
          </View>

          <Controller control={profileForm.control} name="name"
            render={({ field: { onChange, value } }) => (
              <Input label="Name" value={value} onChangeText={onChange} />
            )}
          />
          <Controller control={profileForm.control} name="email"
            render={({ field: { onChange, value } }) => (
              <Input label="Email" value={value} onChangeText={onChange} keyboardType="email-address" />
            )}
          />
          <Controller control={profileForm.control} name="phone"
            render={({ field: { onChange, value } }) => (
              <Input label="Phone Number" value={value} onChangeText={onChange} keyboardType="phone-pad" />
            )}
          />
          <Button title="Save Profile" onPress={profileForm.handleSubmit(onProfileSubmit)} loading={updateProfile.isPending} />
        </Card>
      )}

      {/* System Settings */}
      {activeTab === 'system' && (
        <>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Theme</Text>
            <View style={styles.optionRow}>
              {(['dark', 'light'] as const).map((theme) => (
                <TouchableOpacity
                  key={theme}
                  style={[styles.themeOption, settings.theme === theme && styles.themeOptionActive]}
                  onPress={() => dispatch(setTheme(theme))}
                >
                  <Ionicons
                    name={theme === 'dark' ? 'moon' : 'sunny'}
                    size={24}
                    color={settings.theme === theme ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.themeText, settings.theme === theme && { color: colors.primary }]}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            {(['email', 'push', 'taskUpdates', 'weeklyReport'] as const).map((key) => (
              <TouchableOpacity key={key} style={styles.toggleRow} onPress={() => dispatch(toggleNotification(key))}>
                <Text style={styles.toggleLabel}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                </Text>
                <View style={[styles.toggle, settings.notifications[key] && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, settings.notifications[key] && styles.toggleKnobOn]} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            <Controller control={passwordForm.control} name="currentPassword"
              render={({ field: { onChange, value } }) => (
                <Input label="Current Password" value={value} onChangeText={onChange} secureTextEntry />
              )}
            />
            <Controller control={passwordForm.control} name="newPassword"
              render={({ field: { onChange, value } }) => (
                <Input label="New Password" value={value} onChangeText={onChange} secureTextEntry />
              )}
            />
            <Controller control={passwordForm.control} name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input label="Confirm Password" value={value} onChangeText={onChange} secureTextEntry />
              )}
            />
            <Button title="Update Password" onPress={passwordForm.handleSubmit(onPasswordSubmit)} loading={changePassword.isPending} />
          </Card>
        </>
      )}

      {/* Admin Settings */}
      {activeTab === 'admin' && isAdmin && (
        <>
          <View style={styles.adminHeader}>
            <Text style={styles.sectionTitle}>User Management</Text>
            <Button title="Add User" size="sm" onPress={() => setShowUserModal(true)}
              icon={<Ionicons name="person-add" size={16} color={colors.white} />}
            />
          </View>

          {(users || []).map((u: User) => (
            <Card key={u.id} style={styles.userCard}>
              <View style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{u.name.charAt(0)}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                <Badge label={roleLabels[u.role]} color={roleColors[u.role]} />
                {u.id !== user?.id && (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Delete User', `Remove ${u.name}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteUser.mutate(u.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))}

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Departments</Text>
            {['Management', 'Sales', 'HR', 'Engineering', 'Marketing'].map((dept) => (
              <View key={dept} style={styles.deptRow}>
                <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.deptName}>{dept}</Text>
                <Text style={styles.deptCount}>
                  {(users || []).filter((u: User) => u.department === dept).length} members
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Add User Modal */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New User</Text>
            <Controller control={userForm.control} name="name" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <Input label="Name" value={value} onChangeText={onChange} />
              )}
            />
            <Controller control={userForm.control} name="email" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <Input label="Email" value={value} onChangeText={onChange} keyboardType="email-address" />
              )}
            />
            <Controller control={userForm.control} name="password" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <Input label="Password" value={value} onChangeText={onChange} secureTextEntry />
              )}
            />
            <Controller control={userForm.control} name="department"
              render={({ field: { onChange, value } }) => (
                <Input label="Department" value={value} onChangeText={onChange} />
              )}
            />
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(['ADMIN', 'MEMBER', 'CONTRIBUTOR', 'VIEWER'] as Role[]).map((role) => (
                <Controller key={role} control={userForm.control} name="role"
                  render={({ field: { onChange, value } }) => (
                    <TouchableOpacity
                      style={[styles.roleChip, value === role && { borderColor: roleColors[role] }]}
                      onPress={() => onChange(role)}
                    >
                      <Text style={[styles.roleChipText, value === role && { color: roleColors[role] }]}>
                        {roleLabels[role]}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setShowUserModal(false)} />
              <Button title="Create" onPress={userForm.handleSubmit(onCreateUser)} loading={createUser.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: borderRadius.md, backgroundColor: colors.surface },
  tabActive: { backgroundColor: `${colors.primary}15` },
  tabText: { color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary },
  section: { marginBottom: 16 },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 16 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '700' },
  avatarName: { ...typography.h4, color: colors.text, marginBottom: 4 },
  optionRow: { flexDirection: 'row', gap: 12 },
  themeOption: { flex: 1, alignItems: 'center', padding: 16, borderRadius: borderRadius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  themeOptionActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  themeText: { color: colors.textSecondary, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  toggleLabel: { color: colors.text, fontSize: 15 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceLight, padding: 2 },
  toggleOn: { backgroundColor: colors.primary },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.textMuted },
  toggleKnobOn: { backgroundColor: colors.white, alignSelf: 'flex-end' },
  adminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userCard: { marginBottom: 8, padding: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: colors.white, fontWeight: '600' },
  userInfo: { flex: 1 },
  userName: { ...typography.label, color: colors.text },
  userEmail: { ...typography.caption, color: colors.textMuted },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  deptName: { flex: 1, color: colors.text, fontSize: 15 },
  deptCount: { color: colors.textMuted, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: colors.backgroundLight, borderRadius: borderRadius.xl, padding: 24, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  roleChipText: { fontSize: 13, color: colors.textSecondary },
});
