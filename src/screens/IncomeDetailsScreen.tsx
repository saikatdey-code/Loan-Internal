/**
 * IncomeDetailsScreen — Income Details step matching the WEmanipur UI design.
 * Features:
 * - Back button & Language selector header + Centered Brand Logo
 * - Income Details banner card with coins icon badge
 * - "Total Annual Income of the Family *" section header & subtitle
 * - 4 Selectable Income Tier Cards in a 2x2 grid:
 *   1. Less Than Rs. 1 Lakh (id: "1")
 *   2. Rs. 1 Lakh To Rs. 2 Lakh (id: "2")
 *   3. Rs. 2 Lakh To Rs. 3 Lakh (id: "3")
 *   4. More Than Rs. 3 Lakh (id: "4")
 * - Information strip: "Income details provided will be verified during the application review progress."
 * - Dual action buttons: "← Back" and "Save & Continue →"
 * - API call: POST /api/loan/details with payload:
 *     { familyIncome, otherFamilyIncome, loanId }
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

import { Logo, useToast, WatermarkBackground } from '../components';
import SelectionModal from '../components/SelectionModal';
import type { RootStackScreenProps } from '../types/navigation';
import { isFieldEditable } from '../utils/fieldPermissions';
import {
  getLoanId,
  getStoredLoanDetails,
  setStoredLoanDetails,
} from '../services/storage';
import {
  submitIncomeDetails,
  SubmitIncomePayload,
  getLoanDetailsAuth,
  getLoanList,
} from '../api/loan';
import { checkInternetConnection, showNoInternetAlert } from '../utils';

type Props = RootStackScreenProps<'IncomeDetails'>;

interface IncomeOption {
  id: string;
  prefix?: string;
  amount: string;
}

const INCOME_OPTIONS: IncomeOption[] = [
  {
    id: '1',
    prefix: 'Less Than',
    amount: 'Rs. 1 Lakh',
  },
  {
    id: '2',
    prefix: 'Rs. 1 Lakh To',
    amount: 'Rs. 2 Lakh',
  },
  {
    id: '3',
    prefix: 'Rs. 2 Lakh To',
    amount: 'Rs. 3 Lakh',
  },
  {
    id: '4',
    prefix: 'More Than',
    amount: 'Rs. 3 Lakh',
  },
];

const IncomeDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const toast = useToast();

  const [loanStatus, setLoanStatus] = useState<string>(
    route.params?.loanStatus || '',
  );
  const [fieldList, setFieldList] = useState<any>(
    route.params?.fieldList || null,
  );
  // No auto-selected option by default
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loanId, setLoanId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Field Edit Permissions (if rejected, only allow fields in fieldList)
  const isFamilyIncomeEditable = isFieldEditable(
    'familyIncome',
    fieldList,
    loanStatus,
  );

  // ─── Initialize Data on Mount ────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      try {
        const paramLoanId = route.params?.loanId;
        const storedLoanId = await getLoanId();
        const storedDetails = await getStoredLoanDetails<any>();

        const isInvalidId = (id?: string | null) =>
          !id ||
          id === 'b6c25f77-857d-499c-a712-c64bcd9317a7' ||
          id === 'b69488e4-3d79-4688-b80f-2e01a8a562ba' ||
          id === '1b268acc-508c-4fca-94ca-a3cd4d23fc47';

        const applyIncomeData = (details: any) => {
          if (!details) return;
          if (details.loanStatus && !route.params?.loanStatus) {
            setLoanStatus(details.loanStatus);
          }
          if (details.fieldList && !route.params?.fieldList) {
            setFieldList(details.fieldList);
          }
          const storedIncome =
            details.familyIncome ||
            details.familyIncomeRange?.id ||
            details.loanDetails?.familyIncome ||
            details.incomeDetails?.familyIncome;
          if (storedIncome) {
            setSelectedIncomeId(String(storedIncome));
          }
        };

        // 0. Pre-fill immediately if route passed loanDetails
        if (route.params?.loanDetails) {
          applyIncomeData(route.params.loanDetails);
        }

        // 1. Pre-fill from cached details if available
        if (storedDetails) {
          applyIncomeData(storedDetails);
        }

        // Resolve activeId
        let activeId = paramLoanId;
        if (isInvalidId(activeId)) {
          if (!isInvalidId(storedLoanId)) {
            activeId = storedLoanId!;
          }
        }
        if (isInvalidId(activeId)) {
          if (!isInvalidId(storedDetails?.id)) {
            activeId = storedDetails.id;
          }
        }
        if (isInvalidId(activeId)) {
          try {
            const listRes = await getLoanList();
            if (listRes?.success && listRes.data?.rows?.length > 0) {
              activeId = listRes.data.rows[0].id;
              await setLoanId(activeId);
            }
          } catch (listErr) {
            console.warn('[IncomeDetails] Failed to fetch loan list:', listErr);
          }
        }

        if (isInvalidId(activeId)) {
          activeId = '1b268acc-508c-4fca-94ca-a3cd4d23fc47';
        }

        setLoanId(activeId || '1b268acc-508c-4fca-94ca-a3cd4d23fc47');

        // 2. Fetch fresh details from API if we have a valid loan ID
        if (activeId && !isInvalidId(activeId)) {
          try {
            const res = await getLoanDetailsAuth(activeId);
            if (res && res.success && res.data && isMounted) {
              applyIncomeData(res.data);
              await setStoredLoanDetails(res.data);
            }
          } catch (apiErr) {
            console.warn('[IncomeDetails] Failed to fetch loan details:', apiErr);
          }
        }
      } catch (err) {
        console.error('[IncomeDetails] Error initializing data:', err);
      }
    };

    initializeData();
    return () => {
      isMounted = false;
    };
  }, [route.params?.loanId, route.params?.loanDetails]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Handle Save & Continue ──────────────────────────────────
  const handleSaveAndContinue = async () => {
    // Check internet connection
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      showNoInternetAlert();
      toast.error('Please connect internet');
      return;
    }

    if (!selectedIncomeId) {
      setError('Please choose your annual family income');
      toast.error('Please choose your annual family income');
      Alert.alert(
        'Required Field',
        'Please choose your annual family income from the options provided.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const activeLoanId =
        loanId ||
        route.params?.loanId ||
        (await getLoanId()) ||
        '1b268acc-508c-4fca-94ca-a3cd4d23fc47';

      const payload: SubmitIncomePayload = {
        familyIncome: selectedIncomeId,
        otherFamilyIncome: null,
        loanId: activeLoanId,
      };

      const response = await submitIncomeDetails(payload);

      if (response && response.success) {
        toast.success(
          response.message || 'Income details saved successfully',
        );

        // Cache updated details
        try {
          const stored = (await getStoredLoanDetails<any>()) || {};
          await setStoredLoanDetails({
            ...stored,
            familyIncome: selectedIncomeId,
            otherFamilyIncome: null,
            ...(response.data || {}),
          });
        } catch (e) {
          console.warn('[IncomeDetails] Failed to cache details:', e);
        }

        navigation.navigate('EconomicActivity', {
          loanId: activeLoanId,
          applicationNumber:
            response.data?.applicationNumber ||
            route.params?.applicationNumber,
          fieldList: fieldList || response.data?.fieldList,
          loanStatus: loanStatus || response.data?.loanStatus,
          isEdit: route.params?.isEdit,
        });
      } else {
        const errorMsg =
          response?.message || 'Failed to submit income details';
        toast.error(errorMsg);
        Alert.alert('Submission Error', errorMsg);
      }
    } catch (err: any) {
      console.error('[IncomeDetails] Submit error:', err);
      const isNetworkErr =
        err.message === 'Network Error' ||
        err.code === 'ERR_NETWORK' ||
        (!err.response &&
          (err.isAxiosError || String(err).toLowerCase().includes('network')));

      if (isNetworkErr) {
        showNoInternetAlert();
        toast.error('Please connect internet');
        return;
      }

      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to submit income details. Please try again.';
      toast.error(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handle Skip ─────────────────────────────────────────────
  const handleSkip = () => {
    navigation.navigate('MainTabs', { screen: 'Home' } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* ══════════════════════════════════════════════════════
          TOP NAVIGATION HEADER
         ══════════════════════════════════════════════════════ */}
      <View style={styles.topHeader}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="#00875A"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Centered Brand Logo */}
        <View style={styles.centerLogo}>
          <Logo size="small" showSubtitle={true} />
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipText}>Skip</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke="#00875A"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════
          KEYBOARD-AWARE SCROLL CONTAINER
         ══════════════════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Income Details Banner Card */}
          <View style={styles.bannerCard}>
            <View style={styles.avatarBadge}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                {/* Stack of Coins Icon */}
                <Ellipse cx="12" cy="6" rx="8" ry="3" stroke="#00875A" strokeWidth={1.8} />
                <Path
                  d="M4 6V12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12V6"
                  stroke="#00875A"
                  strokeWidth={1.8}
                />
                <Path
                  d="M4 12V18C4 19.6569 7.58172 21 12 21C16.4183 21 20 19.6569 20 18V12"
                  stroke="#00875A"
                  strokeWidth={1.8}
                />
              </Svg>
            </View>
            <View style={styles.bannerTextWrapper}>
              <Text style={styles.bannerTitle}>Income Details</Text>
              <Text style={styles.bannerSubtitle}>
                Provide information for programme eligibility.
              </Text>
            </View>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Total Annual Income of the Family <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              Please select your annual family income from all sources
            </Text>
          </View>

          {/* ══════════════════════════════════════════════════════
              INCOME CARDS GRID (2x2)
             ══════════════════════════════════════════════════════ */}
          <View style={styles.cardsGrid}>
            {INCOME_OPTIONS.map(option => {
              const isSelected = selectedIncomeId === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.incomeCard,
                    isSelected && styles.incomeCardSelected,
                    Boolean(error) && !selectedIncomeId && styles.incomeCardError,
                    !isFamilyIncomeEditable && !isSelected && styles.incomeCardDisabled,
                    !isFamilyIncomeEditable && isSelected && styles.incomeCardDisabledSelected,
                  ]}
                  disabled={!isFamilyIncomeEditable || isSubmitting}
                  onPress={() => {
                    if (isFamilyIncomeEditable) {
                      setSelectedIncomeId(option.id);
                      if (error) {
                        setError('');
                      }
                    }
                  }}
                  activeOpacity={0.8}>
                  {/* Radio Circle (Top Left) */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}>
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>

                  {/* Center Icon Badge (Stack of Coins) */}
                  <View style={styles.cardIconBadge}>
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      <Ellipse
                        cx="12"
                        cy="6"
                        rx="7"
                        ry="2.5"
                        stroke="#00875A"
                        strokeWidth={1.7}
                      />
                      <Path
                        d="M5 6V11C5 12.38 8.13 13.5 12 13.5C15.87 13.5 19 12.38 19 11V6"
                        stroke="#00875A"
                        strokeWidth={1.7}
                      />
                      <Path
                        d="M5 11V16C5 17.38 8.13 18.5 12 18.5C15.87 18.5 19 17.38 19 16V11"
                        stroke="#00875A"
                        strokeWidth={1.7}
                      />
                    </Svg>
                  </View>

                  {/* Amount / Title Text */}
                  <View style={styles.cardTextContainer}>
                    {option.prefix ? (
                      <Text style={styles.cardPrefixText}>{option.prefix}</Text>
                    ) : null}
                    <Text
                      style={[
                        styles.cardAmountText,
                        isSelected && styles.cardAmountTextSelected,
                      ]}>
                      {option.amount}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* ══════════════════════════════════════════════════════
              INFO NOTICE STRIP
             ══════════════════════════════════════════════════════ */}


          {/* ══════════════════════════════════════════════════════
              BOTTOM BUTTON ROW: [ ← Back ] [ Save & Continue → ]
             ══════════════════════════════════════════════════════ */}
          <View style={styles.bottomButtonsRow}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
              disabled={isSubmitting}
              activeOpacity={0.75}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#00875A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            {/* Save & Continue Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              onPress={handleSaveAndContinue}
              disabled={isSubmitting}
              activeOpacity={0.85}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Save & Continue</Text>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke="#FFFFFF"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Top Header Row
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  backText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  centerLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  skipText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  headerSpacer: {
    minWidth: 70,
  },


  // Main Container
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 36,
  },

  // Banner Card
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF8F3',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // Section Header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#00875A',
    marginBottom: 4,
  },
  redAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // Income Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  incomeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 12,
    position: 'relative',
    alignItems: 'center',
    minHeight: 116,
    justifyContent: 'center',
  },
  incomeCardSelected: {
    borderColor: '#00875A',
    backgroundColor: '#F0FDF4',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeCardError: {
    borderColor: '#EF4444',
  },
  incomeCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  incomeCardDisabledSelected: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
    marginTop: -4,
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  radioCircle: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#00875A',
  },
  radioInnerDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#00875A',
  },
  cardIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  cardTextContainer: {
    alignItems: 'center',
  },
  cardPrefixText: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 2,
  },
  cardAmountText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardAmountTextSelected: {
    color: '#00875A',
  },

  // Info Notice Strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  infoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoIconLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  infoStripText: {
    flex: 1,
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },

  // Bottom Buttons Row: [ ← Back ] [ Save & Continue → ]
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 0.42,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  primaryButton: {
    flex: 0.58,
    height: 50,
    backgroundColor: '#00875A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  keyboardContainer: {
    flex: 1,
  },
});

export default IncomeDetailsScreen;
