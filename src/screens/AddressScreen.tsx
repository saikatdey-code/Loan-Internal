/**
 * AddressScreen — Location & Address details step matching the WEmanipur UI design.
 * Features:
 * - Back button & Language selector header + Centered Brand Logo
 * - Address banner card with location pin badge
 * - "Address" section divider line
 * - "Choose your district *" dropdown selector (with all 16 Manipur districts)
 * - "Locality *" input
 * - "Gram Panchayat / Municipality / Block *" (required) input
 * - Information strip: "Enter the address exactly as it should appear on the application."
 * - Dual action buttons: "← Back" and "Save & Continue →"
 * - API call: POST /api/loan/address-details with payload:
 *     { district, locality, panchayat, loanId }
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { Logo, useToast, WatermarkBackground } from '../components';
import SelectionModal, { OptionItem } from '../components/SelectionModal';
import type { RootStackScreenProps } from '../types/navigation';
import { isFieldEditable } from '../utils/fieldPermissions';
import {
  getLoanId,
  getStoredLoanDetails,
  setStoredLoanDetails,
} from '../services/storage';
import { submitAddressDetails, SubmitAddressPayload, getLoanDetailsAuth, getLoanList } from '../api/loan';
import { checkInternetConnection, showNoInternetAlert } from '../utils';

type Props = RootStackScreenProps<'AddressDetails'>;

type ScrollViewInstance = React.ElementRef<typeof ScrollView>;
type TextInputInstance = React.ElementRef<typeof TextInput>;
type ViewInstance = React.ElementRef<typeof View>;

// 16 Official Districts of Manipur with Numeric IDs
const MANIPUR_DISTRICTS: OptionItem[] = [
  { id: '1', label: 'Imphal West' },
  { id: '2', label: 'Imphal East' },
  { id: '3', label: 'Thoubal' },
  { id: '4', label: 'Bishnupur' },
  { id: '5', label: 'Kakching' },
  { id: '6', label: 'Churachandpur' },
  { id: '7', label: 'Ukhrul' },
  { id: '8', label: 'Senapati' },
  { id: '9', label: 'Tamenglong' },
  { id: '10', label: 'Chandel' },
  { id: '11', label: 'Kangpokpi' },
  { id: '12', label: 'Tengnoupal' },
  { id: '13', label: 'Kamjong' },
  { id: '14', label: 'Noney' },
  { id: '15', label: 'Pherzawl' },
  { id: '16', label: 'Jiribam' },
];

const AddressScreen: React.FC<Props> = ({ navigation, route }) => {
  const toast = useToast();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  // ─── Form State ──────────────────────────────────────────────
  const [loanId, setLoanId] = useState<string>('');
  const [loanStatus, setLoanStatus] = useState<string>(
    route.params?.loanStatus || '',
  );
  const [fieldList, setFieldList] = useState<any>(
    route.params?.fieldList || null,
  );
  const [districtId, setDistrictId] = useState<string>('');
  const [districtLabel, setDistrictLabel] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [panchayat, setPanchayat] = useState<string>('');

  // Field Edit Permissions (if rejected, only allow fields in fieldList)
  const isDistrictEditable = isFieldEditable('district', fieldList, loanStatus);
  const isLocalityEditable = isFieldEditable('locality', fieldList, loanStatus);
  const isPanchayatEditable = isFieldEditable('panchayat', fieldList, loanStatus);

  // ─── UI & Interaction State ─────────────────────────────────
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  // Modals
  const [districtModalVisible, setDistrictModalVisible] =
    useState<boolean>(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Input Refs
  const localityRef = useRef<TextInputInstance | null>(null);
  const localityWrapperRef = useRef<ViewInstance | null>(null);
  const panchayatRef = useRef<TextInputInstance | null>(null);
  const panchayatWrapperRef = useRef<ViewInstance | null>(null);

  // Track keyboard height to adjust ScrollView insets, especially on Android
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToInput = useCallback(
    (targetRef?: React.RefObject<any>, fallbackY = 0) => {
      setTimeout(() => {
        if (targetRef?.current && scrollViewRef.current) {
          (targetRef.current as any).measureLayout?.(
            scrollViewRef.current,
            (_left: number, top: number) => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, top - 80),
                animated: true,
              });
            },
            () => {
              if (fallbackY > 0) {
                scrollViewRef.current?.scrollTo({ y: fallbackY, animated: true });
              }
            },
          );
        } else if (fallbackY > 0) {
          scrollViewRef.current?.scrollTo({ y: fallbackY, animated: true });
        }
      }, Platform.OS === 'android' ? 180 : 80);
    },
    [],
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

        const applyAddressData = (details: any) => {
          if (!details) return;
          const addr = details.addressDetails || details.address;
          if (addr) {
            if (addr.district !== undefined && addr.district !== null) {
              const dId = String(addr.district);
              const districtName =
                (typeof addr.districtName === 'string'
                  ? addr.districtName
                  : addr.districtName?.name) ||
                (typeof addr.district === 'string' && isNaN(Number(addr.district))
                  ? addr.district
                  : '');

              const found = MANIPUR_DISTRICTS.find(
                d =>
                  (districtName &&
                    d.label.toLowerCase() === districtName.toLowerCase()) ||
                  d.id === dId ||
                  (typeof addr.district === 'string' &&
                    d.label.toLowerCase() === addr.district.toLowerCase()),
              );
              if (found) {
                setDistrictId(
                  addr.districtName?.id
                    ? String(addr.districtName.id)
                    : addr.district !== undefined && addr.district !== null
                      ? String(addr.district)
                      : found.id,
                );
                setDistrictLabel(found.label);
              } else {
                setDistrictId(dId);
                if (districtName) {
                  setDistrictLabel(districtName);
                }
              }
            }
            if (addr.locality !== undefined && addr.locality !== null) {
              setLocality(String(addr.locality));
            }
            if (addr.panchayat !== undefined && addr.panchayat !== null) {
              setPanchayat(String(addr.panchayat));
            }
          } else {
            if (details.locality) setLocality(String(details.locality));
            if (details.panchayat) setPanchayat(String(details.panchayat));
          }
          if (details.loanStatus && !route.params?.loanStatus) {
            setLoanStatus(details.loanStatus);
          }
          if (details.fieldList && !route.params?.fieldList) {
            setFieldList(details.fieldList);
          }
        };

        // 0. Pre-fill immediately if route passed loanDetails
        if (route.params?.loanDetails) {
          applyAddressData(route.params.loanDetails);
        }

        // 1. Pre-fill from cached address details if available
        if (storedDetails) {
          applyAddressData(storedDetails);
        }

        // Resolve activeId with fallback to getLoanList()
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
            console.warn('[AddressScreen] Failed to fetch loan list:', listErr);
          }
        }

        if (isInvalidId(activeId)) {
          activeId = '1b268acc-508c-4fca-94ca-a3cd4d23fc47';
        }

        setLoanId(activeId || '1b268acc-508c-4fca-94ca-a3cd4d23fc47');

        // 2. Fetch fresh details from API if we have a valid loan ID
        if (activeId && !isInvalidId(activeId)) {
          try {
            setIsLoading(true);
            const res = await getLoanDetailsAuth(activeId);
            if (res && res.success && res.data && isMounted) {
              applyAddressData(res.data);
              await setStoredLoanDetails(res.data);
            }
          } catch (apiErr) {
            console.warn('[AddressScreen] Failed to fetch loan details:', apiErr);
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        }
      } catch (err) {
        console.error('[AddressScreen] Error initializing data:', err);
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

  // ─── Validation ──────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!districtId || !districtLabel.trim()) {
      newErrors.district = 'District is required';
    }
    if (!locality.trim()) {
      newErrors.locality = 'Locality is required';
    }
    if (!panchayat.trim()) {
      newErrors.panchayat = 'Gram Panchayat / Municipality / Block is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }

    setErrors({});
    return true;
  };

  // ─── Handle Save & Continue ──────────────────────────────────
  const handleSaveAndContinue = async () => {
    // Check internet connection when clicking the button
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      showNoInternetAlert();
      toast.error('Please connect internet');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const activeLoanId =
        loanId ||
        route.params?.loanId ||
        (await getLoanId()) ||
        '1b268acc-508c-4fca-94ca-a3cd4d23fc47';

      const payload: SubmitAddressPayload = {
        district: String(districtId),
        locality: locality.trim(),
        panchayat: panchayat.trim(),
        loanId: activeLoanId,
      };

      const response = await submitAddressDetails(payload);

      if (response && response.success) {
        toast.success(
          response.message || 'Address details saved successfully',
        );

        try {
          const stored = (await getStoredLoanDetails<any>()) || {};
          await setStoredLoanDetails({
            ...stored,
            addressDetails: payload,
            ...(response.data || {}),
          });
        } catch (e) {
          console.warn('[AddressScreen] Failed to cache address details:', e);
        }

        navigation.navigate('IncomeDetails', {
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
          response?.message || 'Failed to submit address details';
        toast.error(errorMsg);
        Alert.alert('Submission Error', errorMsg);
      }
    } catch (err: any) {
      console.error('[AddressScreen] Submit error:', err);
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
        'Unable to submit address details. Please try again.';
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
      </TouchableWithoutFeedback>

      {/* ══════════════════════════════════════════════════════
          KEYBOARD-AWARE FORM CONTAINER
         ══════════════════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>
              {/* Address Banner Card */}
              <View style={styles.bannerCard}>
                <View style={styles.avatarBadge}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 21C16 16.5 19 13.5 19 9.5C19 5.35786 15.866 2 12 2C8.13401 2 5 5.35786 5 9.5C5 13.5 8 16.5 12 21Z"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Circle cx="12" cy="9" r="3" stroke="#00875A" strokeWidth={2} />
                  </Svg>
                </View>
                <View style={styles.bannerTextWrapper}>
                  <Text style={styles.bannerTitle}>Address</Text>
                  <Text style={styles.bannerSubtitle}>
                    Provide the applicant's location details.
                  </Text>
                </View>
              </View>

              {/* Section Divider: Address */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Address</Text>
                <View style={styles.sectionLine} />
              </View>

              {/* ══════════════════════════════════════════════════════
              FIELD 1: CHOOSE YOUR DISTRICT *
             ══════════════════════════════════════════════════════ */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Choose your district <Text style={styles.redAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    Boolean(errors.district) && styles.inputWrapperError,
                    !isDistrictEditable && styles.inputWrapperDisabled,
                  ]}
                  disabled={!isDistrictEditable || isSubmitting}
                  onPress={() => isDistrictEditable && setDistrictModalVisible(true)}
                  activeOpacity={0.85}>
                  <View style={styles.fieldIcon}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 21C16 16.5 19 13.5 19 9.5C19 5.35786 15.866 2 12 2C8.13401 2 5 5.35786 5 9.5C5 13.5 8 16.5 12 21Z"
                        stroke="#64748B"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Circle cx="12" cy="9" r="3" stroke="#64748B" strokeWidth={1.8} />
                    </Svg>
                  </View>
                  <Text
                    style={[
                      styles.pressableText,
                      !districtLabel && styles.placeholderText,
                    ]}>
                    {districtLabel || 'Choose your district'}
                  </Text>
                  <View style={styles.rightActionIcon}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M6 9L12 15L18 9"
                        stroke="#334155"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                </TouchableOpacity>
                {errors.district ? (
                  <Text style={styles.errorText}>{errors.district}</Text>
                ) : null}
              </View>

              {/* ══════════════════════════════════════════════════════
              FIELD 2: LOCALITY *
             ══════════════════════════════════════════════════════ */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Locality <Text style={styles.redAsterisk}>*</Text>
                </Text>
                <Pressable
                  ref={localityWrapperRef}
                  style={[
                    styles.inputWrapper,
                    focusedField === 'locality' && styles.inputWrapperFocused,
                    Boolean(errors.locality) && styles.inputWrapperError,
                    !isLocalityEditable && styles.inputWrapperDisabled,
                  ]}
                  onPress={() => {
                    if (isLocalityEditable) {
                      localityRef.current?.focus();
                    }
                  }}>
                  <View style={styles.fieldIcon}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 21C16 16.5 19 13.5 19 9.5C19 5.35786 15.866 2 12 2C8.13401 2 5 5.35786 5 9.5C5 13.5 8 16.5 12 21Z"
                        stroke="#64748B"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Circle cx="12" cy="9" r="3" stroke="#64748B" strokeWidth={1.8} />
                    </Svg>
                  </View>
                  <TextInput
                    ref={localityRef}
                    style={[
                      styles.textInput,
                      !isLocalityEditable && styles.textInputDisabled,
                    ]}
                    value={locality}
                    editable={isLocalityEditable && !isSubmitting}
                    onChangeText={text => {
                      setLocality(text);
                      if (errors.locality) {
                        setErrors(prev => ({ ...prev, locality: '' }));
                      }
                    }}
                    placeholder="Enter locality / village"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    onFocus={() => {
                      if (isLocalityEditable) {
                        setFocusedField('locality');
                        scrollToInput(localityWrapperRef, 160);
                      }
                    }}
                    onBlur={() => setFocusedField(null)}
                  />
                </Pressable>
                {errors.locality ? (
                  <Text style={styles.errorText}>{errors.locality}</Text>
                ) : null}
              </View>

              {/* ══════════════════════════════════════════════════════
              FIELD 3: GRAM PANCHAYAT / MUNICIPALITY / BLOCK *
             ══════════════════════════════════════════════════════ */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Gram Panchayat / Municipality / Block{' '}
                  <Text style={styles.redAsterisk}>*</Text>
                </Text>
                <Pressable
                  ref={panchayatWrapperRef}
                  style={[
                    styles.inputWrapper,
                    focusedField === 'panchayat' && styles.inputWrapperFocused,
                    Boolean(errors.panchayat) && styles.inputWrapperError,
                    !isPanchayatEditable && styles.inputWrapperDisabled,
                  ]}
                  onPress={() => {
                    if (isPanchayatEditable) {
                      panchayatRef.current?.focus();
                    }
                  }}>
                  <View style={styles.fieldIcon}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M3 21H21M4 18H20M5 18V10M9 18V10M15 18V10M19 18V10M12 2L2 7H22L12 2Z"
                        stroke="#64748B"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                  <TextInput
                    ref={panchayatRef}
                    style={[
                      styles.textInput,
                      !isPanchayatEditable && styles.textInputDisabled,
                    ]}
                    value={panchayat}
                    editable={isPanchayatEditable && !isSubmitting}
                    onChangeText={text => {
                      setPanchayat(text);
                      if (errors.panchayat) {
                        setErrors(prev => ({ ...prev, panchayat: '' }));
                      }
                    }}
                    placeholder="Enter gram panchayat / municipality / block"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="done"
                    onFocus={() => {
                      if (isPanchayatEditable) {
                        setFocusedField('panchayat');
                        scrollToInput(panchayatWrapperRef, 260);
                      }
                    }}
                    onBlur={() => setFocusedField(null)}
                  />
                </Pressable>
                {errors.panchayat ? (
                  <Text style={styles.errorText}>{errors.panchayat}</Text>
                ) : null}
              </View>

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
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════════════════
          MODALS
         ══════════════════════════════════════════════════════ */}
      {/* District Selection Modal */}
      <SelectionModal
        visible={districtModalVisible}
        title="Choose Your District"
        options={MANIPUR_DISTRICTS}
        selectedValue={districtId}
        onSelect={opt => {
          setDistrictId(opt.id);
          setDistrictLabel(opt.label);
          if (errors.district) {
            setErrors(prev => ({ ...prev, district: '' }));
          }
        }}
        onClose={() => setDistrictModalVisible(false)}
      />




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
  keyboardContainer: {
    flex: 1,
  },
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#00875A',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#B6E3CB',
    marginLeft: 10,
  },

  // Field Group
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  redAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1.2,
    borderColor: '#D8DDE1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: '#00875A',
    backgroundColor: '#FAFCFA',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputWrapperDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D8DDE1',
  },
  fieldIcon: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  textInputDisabled: {
    color: '#334155',
  },
  pressableText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  rightActionIcon: {
    paddingLeft: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },

  // Info Notice Strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  infoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
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
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },

  // Bottom Buttons Row
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00875A',
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#00875A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AddressScreen;
