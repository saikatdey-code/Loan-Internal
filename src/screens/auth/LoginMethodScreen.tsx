/**
 * LoginMethodScreen — Applicant Login Method Selection Screen
 * Matches the design:
 * - Top Badge: Green circular icon with user/person icon
 * - Title: "Applicant Login"
 * - Subtitle: "Please choose a login method to continue"
 * - Radio Option 1: "Login with Mobile Number"
 * - Radio Option 2: "Login with Application Number"
 * - "Continue >" button
 * - Divider: "New Applicant?"
 * - "Apply Now" button with user-plus icon
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { AuthHeader, WatermarkBackground } from '../../components/auth';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Layout } from '../../constants/layout';

interface LoginMethodScreenProps {
  onSelectMobile: () => void;
  onSelectApplication: () => void;
  onApplyNow: () => void;
  onBack?: () => void;
}

const LoginMethodScreen: React.FC<LoginMethodScreenProps> = ({
  onSelectMobile,
  onSelectApplication,
  onApplyNow,
  onBack,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'MOBILE' | 'APPLICATION'>('MOBILE');

  const handleContinue = () => {
    if (selectedMethod === 'MOBILE') {
      onSelectMobile();
    } else {
      onSelectApplication();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* Navigation Header */}
      <AuthHeader showBack={Boolean(onBack)} onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Top Avatar Badge */}
        <View style={styles.topAvatarContainer}>
          <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
            <Circle
              cx="12"
              cy="12"
              r="10"
              stroke={Colors.primary}
              strokeWidth={1.8}
            />
            <Circle
              cx="12"
              cy="9"
              r="3.2"
              stroke={Colors.primary}
              strokeWidth={1.8}
            />
            <Path
              d="M6.5 18C7.5 15.2 9.5 14 12 14C14.5 14 16.5 15.2 17.5 18"
              stroke={Colors.primary}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Applicant Login</Text>
        <Text style={styles.subtitle}>
          Please choose a login method to continue
        </Text>

        {/* Subtle Divider */}
        <View style={styles.divider} />

        {/* Option 1: Login with Mobile Number */}
        <TouchableOpacity
          style={[
            styles.card,
            selectedMethod === 'MOBILE' ? styles.cardSelected : styles.cardUnselected,
          ]}
          onPress={() => setSelectedMethod('MOBILE')}
          activeOpacity={0.85}>
          {/* Radio Button */}
          <View
            style={[
              styles.radioOuter,
              selectedMethod === 'MOBILE' && styles.radioOuterSelected,
            ]}>
            {selectedMethod === 'MOBILE' && <View style={styles.radioInner} />}
          </View>

          {/* Icon Circle */}
          <View style={[styles.iconCircle, styles.mobileIconCircle]}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Rect
                x="6"
                y="3"
                width="12"
                height="18"
                rx="2.5"
                stroke={Colors.primary}
                strokeWidth={2}
              />
              <Circle cx="12" cy="17.5" r="1" fill={Colors.primary} />
            </Svg>
          </View>

          {/* Text Information */}
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Login with Mobile Number</Text>
            <Text style={styles.cardSubtitle}>
              Enter your registered mobile number to receive an OTP
            </Text>
          </View>

          {/* Right Chevron */}
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 18L15 12L9 6"
              stroke={Colors.primary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>



        {/* Primary Button: Continue */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinue}
          activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 18L15 12L9 6"
              stroke="#FFFFFF"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>



        {/* Apply Now Button */}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.xl,
    paddingBottom: Layout.spacing['2xl'],
    justifyContent: 'center',
  },
  topAvatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F8F0',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Layout.spacing.xl,
  },
  card: {
    borderRadius: Layout.borderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    ...Layout.shadow.sm,
  },
  cardUnselected: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  mobileIconCircle: {
    backgroundColor: '#E6F7F0',
  },
  applicationIconCircle: {
    backgroundColor: '#E8F2FF',
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 6,
  },
  cardTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  primaryButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Layout.spacing.md,
    ...Layout.shadow.md,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Layout.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: Typography.fontSize.sm,
    color: '#64748B',
    fontWeight: Typography.fontWeight.medium,
    marginHorizontal: Layout.spacing.md,
  },
  applyNowButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Layout.shadow.md,
  },
  applyNowButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
});

export default LoginMethodScreen;
