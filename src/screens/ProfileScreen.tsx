import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {Colors} from '../constants/colors';
import {Typography} from '../constants/typography';
import {Layout} from '../constants/layout';
import {clearAll} from '../services/storage';
import type {MainTabScreenProps} from '../types/navigation';

type Props = MainTabScreenProps<'Profile'>;

const ProfileScreen: React.FC<Props> = ({navigation}) => {
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of WEManipur?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          const parentNav = navigation.getParent();
          if (parentNav) {
            parentNav.reset({
              index: 0,
              routes: [{name: 'Onboarding'}],
            });
          } else {
            navigation.navigate('Onboarding');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>
          Manage your account, view saved documents, and update your personal
          information.
        </Text>

        {/* Temporary Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
              stroke="#DC2626"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M16 17L21 12L16 7M21 12H9"
              stroke="#DC2626"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing['2xl'],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
  },
  avatarText: {
    fontSize: 36,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    lineHeight: Typography.fontSize.md * Typography.lineHeight.relaxed,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    borderRadius: Layout.borderRadius.xl,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing['2xl'],
    marginTop: Layout.spacing['3xl'],
    minWidth: 160,
  },
  logoutButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: '#DC2626',
  },
});

export default ProfileScreen;
