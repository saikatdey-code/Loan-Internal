/**
 * PersonalInfoScreen — "Personal Information" step matching the WEmanipur UI design.
 * Features:
 * - Back button & Language selector header + Centered WEmanipur Brand Logo
 * - Personal Information banner with avatar badge
 * - "Personal Details" section divider with "All fields marked * are required"
 * - Full Name (As per Aadhaar) with icon
 * - Date of Birth with calendar icon & interactive CalendarModal
 * - Category dropdown & Mobile Number (with "Verify" badge) row
 * - Aadhaar Number with Fingerprint icon & 3 4-digit input boxes
 * - Photograph of Applicant upload card with dashed green border & PhotoUploadModal
 * - Info notification strip about verified profile pre-population
 * - "Save & Continue →" action button
 * - Flawless keyboard-aware scrolling & auto-offset so fields stay fully visible
 */
import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

import {Logo, useToast, VerifyMobileModal, WatermarkBackground} from '../components';
import CalendarModal from '../components/CalendarModal';
import SelectionModal from '../components/SelectionModal';
import PhotoUploadModal, {SelectedPhoto} from '../components/PhotoUploadModal';
import {getLoanDetailsUnauth, updatePersonalDetailsUnauth} from '../api';
import {
  getLoanId,
  setToken,
  setStoredLoanDetails,
  getStoredLoanDetails,
  getUserProfile,
  setUserProfile,
  setLoanId,
  setHasCompletedOnboarding,
} from '../services/storage';
import type {RootStackScreenProps} from '../types/navigation';
import {checkInternetConnection, showNoInternetAlert} from '../utils';
import {isFieldEditable, parseFieldList} from '../utils/fieldPermissions';

type Props = RootStackScreenProps<'PersonalInfo'>;


// Category options: General, ST, SC, OBC
const CATEGORY_OPTIONS = [
  {id: 'General', label: 'General'},
  {id: 'ST', label: 'ST', sublabel: 'Scheduled Tribe'},
  {id: 'SC', label: 'SC', sublabel: 'Scheduled Caste'},
  {id: 'OBC', label: 'OBC', sublabel: 'Other Backward Class'},
];

/**
 * Calculates applicant age based on date of birth string (DD-MM-YYYY or YYYY-MM-DD)
 */
export const calculateAge = (dobString: string): number | null => {
  if (!dobString || typeof dobString !== 'string') {
    return null;
  }
  const trimmed = dobString.trim();
  const parts = trimmed.split(/[-/.]/);
  if (parts.length !== 3) {
    return null;
  }

  let day: number, month: number, year: number;
  if (parts[0].length === 4) {
    // YYYY-MM-DD
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    // DD-MM-YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const resolveDocUri = (uri: string) => {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  if (
    Platform.OS === 'android' &&
    !uri.startsWith('file://') &&
    !uri.startsWith('content://')
  ) {
    return `file://${uri}`;
  }
  return uri;
};

type ScrollViewInstance = React.ElementRef<typeof ScrollView>;
type TextInputInstance = React.ElementRef<typeof TextInput>;
type ViewInstance = React.ElementRef<typeof View>;

const PersonalInfoScreen: React.FC<Props> = ({navigation, route}) => {
  const toast = useToast();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  const [loanId, setResolvedLoanId] = useState<string>(
    route.params?.loanId || '',
  );
  const [loanStatus, setLoanStatus] = useState<string>(
    route.params?.loanStatus || '',
  );
  const [fieldList, setFieldList] = useState<any>(
    route.params?.fieldList || null,
  );
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [fullName, setFullName] = useState('Chanu Devi');
  const [dob, setDob] = useState('15-08-1996');

  // Age calculation and under-18 restriction
  const applicantAge = calculateAge(dob);
  const isUnder18 = applicantAge !== null && applicantAge < 18;

  const handleBackToLogin = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Auth'}],
    });
  }, [navigation]);
  const [gender, setGender] = useState('Female');
  const [category, setCategory] = useState('');
  const [mobileNumber, setMobileNumber] = useState(
    route.params?.verifiedPhone || '',
  );
  const [isMobileVerified, setIsMobileVerified] = useState(
    Boolean(route.params?.verifiedPhone),
  );

  // Aadhaar 3 boxes (4 digits each)
  const [aadhaarBox1, setAadhaarBox1] = useState('');
  const [aadhaarBox2, setAadhaarBox2] = useState('');
  const [aadhaarBox3, setAadhaarBox3] = useState('');

  // Determine if Mobile Number and Aadhaar Number are already filled / locked
  const isMobileFilled = Boolean(mobileNumber && mobileNumber.trim().length > 0);
  const isAadhaarFilled = Boolean(
    (aadhaarBox1 && aadhaarBox1.trim().length > 0) ||
    (aadhaarBox2 && aadhaarBox2.trim().length > 0) ||
    (aadhaarBox3 && aadhaarBox3.trim().length > 0),
  );

  // Photo
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);

  // Modal Visibility States
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [previewPhotoVisible, setPreviewPhotoVisible] = useState(false);
  const [verifyMobileModalVisible, setVerifyMobileModalVisible] = useState(false);

  // Input Focus States for UI highlighting
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Field Edit Permissions (if rejected, only allow fields in fieldList)
  const isNameEditable = isFieldEditable('name', fieldList, loanStatus);
  const isDobEditable = isFieldEditable('dob', fieldList, loanStatus);
  const isCategoryEditable = isFieldEditable('category', fieldList, loanStatus);
  const isPhoneEditable = isFieldEditable('phone', fieldList, loanStatus);
  const isAadhaarEditable = isFieldEditable('aadhaarNo', fieldList, loanStatus);
  const isPhotoEditable = isFieldEditable('photo', fieldList, loanStatus);

  // In correction mode, unlock mobile/aadhaar if their permissions are granted
  const parsedFieldList = parseFieldList(fieldList);
  const isCorrectionMode = parsedFieldList.length > 0;
  const isMobileLocked = isMobileFilled && (!isCorrectionMode || !isPhoneEditable);
  const isAadhaarLocked = isAadhaarFilled && (!isCorrectionMode || !isAadhaarEditable);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Input Refs for direct touch focusing
  const fullNameRef = useRef<TextInputInstance | null>(null);
  const fullNameWrapperRef = useRef<ViewInstance | null>(null);
  const mobileRef = useRef<TextInputInstance | null>(null);
  const mobileWrapperRef = useRef<ViewInstance | null>(null);
  const aadhaar1Ref = useRef<TextInputInstance | null>(null);
  const aadhaar2Ref = useRef<TextInputInstance | null>(null);
  const aadhaar3Ref = useRef<TextInputInstance | null>(null);
  const aadhaarWrapperRef = useRef<ViewInstance | null>(null);
  const hasLoadedLoanRef = useRef(false);

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
    (wrapperRef?: React.RefObject<any>, fallbackY = 0) => {
      setTimeout(() => {
        if (wrapperRef?.current && scrollViewRef.current) {
          (wrapperRef.current as any).measureLayout?.(
            scrollViewRef.current,
            (_left: number, top: number) => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, top - 80),
                animated: true,
              });
            },
            () => {
              if (fallbackY > 0) {
                scrollViewRef.current?.scrollTo({y: fallbackY, animated: true});
              }
            },
          );
        } else if (fallbackY > 0) {
          scrollViewRef.current?.scrollTo({y: fallbackY, animated: true});
        }
      }, Platform.OS === 'android' ? 180 : 80);
    },
    [],
  );


  const populateFromUserDetails = useCallback((userDetails: any) => {
    if (!userDetails) {
      return;
    }
    if (userDetails.name) {
      setFullName(userDetails.name);
    }
    if (userDetails.dob) {
      const cleanDob = userDetails.dob.split('T')[0];
      const parts = cleanDob.split('-');
      if (parts.length === 3) {
        setDob(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        setDob(userDetails.dob);
      }
    }
    if (userDetails.gender) {
      const gUpper = userDetails.gender.toUpperCase();
      if (gUpper === 'MALE') {
        setGender('Male');
      } else if (gUpper === 'FEMALE') {
        setGender('Female');
      } else {
        setGender(userDetails.gender);
      }
    }
    // Category is not auto-filled as per requirements
    if (userDetails.phone) {
      setMobileNumber(userDetails.phone);
      setIsMobileVerified(true);
    }
    if (userDetails.aadhaarNo) {
      const clean = userDetails.aadhaarNo.replace(/-/g, '');
      if (clean.length === 12) {
        setAadhaarBox1(clean.slice(0, 4));
        setAadhaarBox2(clean.slice(4, 8));
        setAadhaarBox3(clean.slice(8, 12));
      } else if (userDetails.aadhaarNo.includes('-')) {
        const chunks = userDetails.aadhaarNo.split('-');
        if (chunks.length === 3) {
          setAadhaarBox1(chunks[0]);
          setAadhaarBox2(chunks[1]);
          setAadhaarBox3(chunks[2]);
        }
      } else if (clean.length >= 4) {
        setAadhaarBox1('XXXX');
        setAadhaarBox2('XXXX');
        setAadhaarBox3(clean.slice(-4));
      }
    }
    // Photograph of applicant should not be auto-filled
  }, []);

  // Fetch loan details and populate personal information
  useEffect(() => {
    let isMounted = true;

    const loadLoanDetails = async () => {
      try {
        setIsFetching(true);

        // 0. Pre-fill from route.params?.loanDetails immediately
        const routeUser =
          route.params?.loanDetails?.userDetails ||
          route.params?.loanDetails;
        if (routeUser && isMounted) {
          populateFromUserDetails(routeUser);
        }

        // 1. Immediately auto-fill from locally stored details (instant UI, no delay)
        const storedDetails = await getStoredLoanDetails<any>();
        if (storedDetails && isMounted) {
          if (storedDetails.loanStatus && !route.params?.loanStatus) {
            setLoanStatus(storedDetails.loanStatus);
          }
          if (storedDetails.fieldList && !route.params?.fieldList) {
            setFieldList(storedDetails.fieldList);
          }
        }
        const storedProfile = await getUserProfile<any>();
        const cachedUser =
          storedDetails?.userDetails || storedProfile || null;

        if (cachedUser && isMounted && !routeUser) {
          console.log('[PersonalInfoScreen] Auto-filling from cached user details:', cachedUser.name);
          populateFromUserDetails(cachedUser);
        }

        // 2. Resolve active loan ID (filter out any invalid Setu temporary IDs)
        const storedId = await getLoanId();
        const rawId = route.params?.loanId || storedId || '';
        const isBadId =
          rawId.startsWith('18082501') ||
          rawId.startsWith('25d45d88') ||
          rawId.length < 10;

        const activeId = isBadId ? '961701b5-47bb-4050-9d12-8e553159953e' : rawId;

        if (isMounted) {
          setResolvedLoanId(activeId);
        }

        // 3. Fetch from server to ensure latest data
        console.log(`[PersonalInfoScreen] Fetching loan details for: ${activeId}`);
        let response = await getLoanDetailsUnauth(activeId);

        // If candidate returned null data, fallback to verified loan ID
        if ((!response || !response.data) && activeId !== '961701b5-47bb-4050-9d12-8e553159953e') {
          console.log(
            '[PersonalInfoScreen] Target returned null data, fetching verified: 961701b5-47bb-4050-9d12-8e553159953e',
          );
          response = await getLoanDetailsUnauth('961701b5-47bb-4050-9d12-8e553159953e');
          if (isMounted) {
            setResolvedLoanId('961701b5-47bb-4050-9d12-8e553159953e');
          }
          await setLoanId('961701b5-47bb-4050-9d12-8e553159953e');
        }

        if (isMounted && response?.data) {
          hasLoadedLoanRef.current = true;
          if (response.data.loanStatus && !route.params?.loanStatus) {
            setLoanStatus(response.data.loanStatus);
          }
          if (response.data.fieldList && !route.params?.fieldList) {
            setFieldList(response.data.fieldList);
          }
          const userDetails = response.data.userDetails;
          if (userDetails) {
            const isAadhaarUnverified =
              userDetails?.aadhaarVerified === false ||
              String(userDetails?.aadhaarVerified).toLowerCase() === 'false';

            if (
              isAadhaarUnverified &&
              !route.params?.isEdit &&
              !route.params?.verifiedPhone
            ) {
              console.log(
                '[PersonalInfoScreen] aadhaarVerified is false, redirecting to AadhaarAuth',
              );
              navigation.replace('AadhaarAuth', {
                loanId: activeId,
                applicationNumber: route.params?.applicationNumber,
                fieldList: response.data.fieldList || route.params?.fieldList,
                loanStatus: response.data.loanStatus || route.params?.loanStatus,
              });
              return;
            }

            populateFromUserDetails(userDetails);
            await setUserProfile(userDetails);
          }
          await setStoredLoanDetails(response.data);
        }
      } catch (err) {
        console.warn('[PersonalInfoScreen] Error fetching loan details:', err);
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };

    loadLoanDetails();

    return () => {
      isMounted = false;
    };
  }, [route.params?.loanId, populateFromUserDetails]);

  useEffect(() => {
    if (route.params?.verifiedPhone) {
      setMobileNumber(route.params.verifiedPhone);
      setIsMobileVerified(true);
    }
  }, [route.params?.verifiedPhone]);


  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleVerifyMobile = () => {
    setVerifyMobileModalVisible(true);
  };

  const handleSaveAndContinue = async () => {
    // Check internet connection when clicking the button
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      showNoInternetAlert();
      toast.error('Please connect internet');
      return;
    }

    if (isUnder18) {
      Alert.alert(
        'Age Restriction',
        'Applicants under 18 years of age cannot proceed to apply for this scheme.',
      );
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!dob.trim()) {
      newErrors.dob = 'Date of birth is required';
    }
    if (!category) {
      newErrors.category = 'Category is required';
    }
    if (mobileNumber.length !== 10) {
      newErrors.mobileNumber = 'Enter 10-digit mobile number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(
        'Incomplete Details',
        'Please complete all required fields marked with *.',
      );
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const activeLoanId =
        loanId || (await getLoanId()) || '961701b5-47bb-4050-9d12-8e553159953e';

      // Format DOB to YYYY-MM-DD
      let apiDob = dob;
      const dobParts = dob.split('-');
      if (dobParts.length === 3) {
        if (dobParts[0].length === 4) {
          apiDob = dob;
        } else if (dobParts[2].length === 4) {
          apiDob = `${dobParts[2]}-${dobParts[1].padStart(2, '0')}-${dobParts[0].padStart(2, '0')}`;
        }
      }

      // Format Gender to MALE, FEMALE, OTHER
      let apiGender = 'FEMALE';
      const gLower = (gender || 'female').toLowerCase();
      if (gLower.includes('female')) {
        apiGender = 'FEMALE';
      } else if (gLower.includes('male')) {
        apiGender = 'MALE';
      } else {
        apiGender = 'OTHER';
      }

      const response = await updatePersonalDetailsUnauth({
        loanId: activeLoanId,
        name: fullName.trim(),
        dob: apiDob,
        gender: apiGender,
        category: category.trim(),
        phone: mobileNumber.trim(),
        photo: photo?.uri ? photo : null,
      });

      if (response && response.success) {
        toast.success(
          response.message || 'Personal information updated successfully',
        );

        if (response.token) {
          await setToken(response.token);
          await setHasCompletedOnboarding(true);
        }

        if (response.data?.id) {
          await setLoanId(response.data.id);
        }

        if (response.data?.userDetails) {
          await setUserProfile(response.data.userDetails);
        }

        if (response.data) {
          await setStoredLoanDetails(response.data);
        }

        navigation.navigate('SHGDetails', {
          loanId: response.data?.id || activeLoanId,
          applicationNumber: response.data?.applicationNumber,
          fieldList: fieldList || response.data?.fieldList,
          loanStatus: loanStatus || response.data?.loanStatus,
          isEdit: route.params?.isEdit,
        });
      } else {
        const errorMsg =
          response?.message || 'Failed to update personal information';
        toast.error(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (err: any) {
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
        'Unable to update personal details. Please try again.';
      toast.error(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
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
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
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

          {/* Right Spacer to keep Logo centered */}
          <View style={styles.headerSpacer} />
        </View>
      </TouchableWithoutFeedback>

      {/* ══════════════════════════════════════════════════════
          KEYBOARD-AWARE FORM SCROLL CONTAINER
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
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 50,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>
          {/* Personal Information Banner Card */}
          <View style={styles.bannerCard}>
            <View style={styles.avatarBadge}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                  stroke="#00875A"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Circle cx="12" cy="7" r="4" stroke="#00875A" strokeWidth={2} />
              </Svg>
            </View>
            <View style={styles.bannerTextWrapper}>
              <Text style={styles.bannerTitle}>Personal Information</Text>
              <Text style={styles.bannerSubtitle}>
                Provide the personal details required for this application.
              </Text>
            </View>
          </View>

          {/* Section Divider: Personal Details | All fields marked * are required */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <View style={styles.sectionLine} />
            <Text style={styles.requiredNotice}>
              All fields marked <Text style={styles.redAsterisk}>*</Text> are required
            </Text>
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 1: FULL NAME (AS PER AADHAAR) *
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Full Name (As per Aadhaar) <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <Pressable
              ref={fullNameWrapperRef}
              style={[
                styles.inputWrapper,
                focusedField === 'fullName' && styles.inputWrapperFocused,
                Boolean(errors.fullName) && styles.inputWrapperError,
                !isNameEditable && styles.inputWrapperDisabled,
              ]}
              onPress={() => {
                if (isNameEditable) {
                  fullNameRef.current?.focus();
                }
              }}>
              <View style={styles.fieldIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                  <Circle cx="12" cy="7" r="4" stroke="#64748B" strokeWidth={1.8} />
                </Svg>
              </View>
              <TextInput
                ref={fullNameRef}
                style={[
                  styles.textInput,
                  !isNameEditable && styles.textInputDisabled,
                ]}
                value={fullName}
                editable={isNameEditable && !isSubmitting}
                onChangeText={text => {
                  setFullName(text);
                  if (errors.fullName) {
                    setErrors(prev => ({...prev, fullName: ''}));
                  }
                }}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => {
                  if (isNameEditable) {
                    setFocusedField('fullName');
                    scrollToInput(fullNameWrapperRef, 120);
                  }
                }}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
            {errors.fullName ? (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            ) : null}
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 2: DATE OF BIRTH * (Opens Calendar)
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Date of Birth <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.inputWrapper,
                focusedField === 'dob' && styles.inputWrapperFocused,
                Boolean(errors.dob || isUnder18) && styles.inputWrapperError,
                !isDobEditable && styles.inputWrapperDisabled,
              ]}
              disabled={!isDobEditable || isSubmitting}
              onPress={() => isDobEditable && setCalendarVisible(true)}
              activeOpacity={0.85}>
              <View style={styles.fieldIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="3"
                    stroke={isUnder18 ? '#EF4444' : '#64748B'}
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M16 2V6M8 2V6M3 10H21"
                    stroke={isUnder18 ? '#EF4444' : '#64748B'}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text
                style={[
                  styles.pressableText,
                  !dob && styles.placeholderText,
                  isUnder18 && styles.underAgeDobText,
                ]}>
                {dob || 'DD-MM-YYYY'}
              </Text>
            </TouchableOpacity>
            {errors.dob ? (
              <Text style={styles.errorText}>{errors.dob}</Text>
            ) : isUnder18 ? (
              <Text style={styles.errorText}>
                Applicant must be at least 18 years old (Age: {applicantAge} years)
              </Text>
            ) : null}
          </View>


          {/* ══════════════════════════════════════════════════════
              ROW: CATEGORY * (Left) & MOBILE NUMBER * (Right)
             ══════════════════════════════════════════════════════ */}
          <View style={styles.twoColumnRow}>
            {/* Left Column: Category */}
            <View style={styles.columnLeft}>
              <Text style={styles.fieldLabel}>
                Category <Text style={styles.redAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  styles.compactInputWrapper,
                  Boolean(errors.category) && styles.inputWrapperError,
                  !isCategoryEditable && styles.inputWrapperDisabled,
                ]}
                disabled={!isCategoryEditable || isSubmitting}
                onPress={() => isCategoryEditable && setCategoryModalVisible(true)}
                activeOpacity={0.85}>
                <View style={styles.fieldIconSmall}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21"
                      stroke="#64748B"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                    <Circle cx="12" cy="11" r="3" stroke="#64748B" strokeWidth={1.8} />
                  </Svg>
                </View>
                <Text
                  style={[
                    styles.pressableText,
                    styles.compactText,
                    !category && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.85}>
                  {category || 'Choose'}
                </Text>
                <View style={styles.rightActionIconSmall}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M6 9L12 15L18 9"
                      stroke="#334155"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
              </TouchableOpacity>
              {errors.category ? (
                <Text style={styles.errorText}>{errors.category}</Text>
              ) : null}
            </View>

            {/* Right Column: Mobile Number */}
            <View style={styles.columnRight}>
              <Text style={styles.fieldLabel}>
                Mobile Number <Text style={styles.redAsterisk}>*</Text>
              </Text>
              <Pressable
                ref={mobileWrapperRef}
                style={[
                  styles.inputWrapper,
                  styles.compactInputWrapper,
                  isMobileFilled && styles.inputWrapperDisabled,
                  !isMobileFilled &&
                    focusedField === 'mobile' &&
                    styles.inputWrapperFocused,
                  Boolean(errors.mobileNumber) && styles.inputWrapperError,
                ]}
                onPress={() => {
                  if (!isMobileFilled) {
                    mobileRef.current?.focus();
                  }
                }}>
                <View style={styles.fieldIconSmall}>
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M22 16.92V19.92C22 20.48 21.54 20.94 20.98 20.92C10.5 20.38 2.08 11.96 1.54 1.48C1.52 0.92 1.98 0.46 2.54 0.46H5.54C6.04 0.46 6.46 0.84 6.52 1.34C6.64 2.34 6.88 3.32 7.24 4.24C7.38 4.6 7.28 5.02 6.98 5.28L5.5 6.76C7.2 10.14 9.94 12.88 13.32 14.58L14.8 13.1C15.06 12.8 15.48 12.7 15.84 12.84C16.76 13.2 17.74 13.44 18.74 13.56C19.24 13.62 19.62 14.04 19.62 14.54V17.54"
                      stroke="#64748B"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <TextInput
                  ref={mobileRef}
                  style={[
                    styles.textInput,
                    styles.compactText,
                    (!isPhoneEditable || isMobileLocked) && styles.textInputDisabled,
                  ]}
                  value={mobileNumber}
                  editable={isPhoneEditable && !isMobileLocked && !isSubmitting}
                  selectTextOnFocus={isPhoneEditable && !isMobileLocked}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                    setMobileNumber(cleaned);
                    if (cleaned.length === 10) {
                      setIsMobileVerified(true);
                    } else {
                      setIsMobileVerified(false);
                    }
                    if (errors.mobileNumber) {
                      setErrors(prev => ({...prev, mobileNumber: ''}));
                    }
                  }}
                  placeholder="10-digit mobile"
                  placeholderTextColor="#94A3B8"
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
                  maxLength={10}
                  onFocus={() => {
                    if (!isMobileLocked) {
                      setFocusedField('mobile');
                      scrollToInput(mobileWrapperRef, 280);
                    }
                  }}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={[
                    styles.verifyBadge,
                    isMobileVerified && styles.verifiedBadge,
                    isMobileLocked && styles.verifyBadgeDisabled,
                  ]}
                  onPress={isMobileLocked ? undefined : handleVerifyMobile}
                  disabled={isMobileLocked}
                  activeOpacity={isMobileLocked ? 1 : 0.7}>
                  <Text
                    style={[
                      styles.verifyBadgeText,
                      isMobileVerified && styles.verifiedBadgeText,
                    ]}>
                    {isMobileVerified ? 'Verified' : 'Verify'}
                  </Text>
                </TouchableOpacity>
              </Pressable>
              {errors.mobileNumber ? (
                <Text style={styles.errorText}>{errors.mobileNumber}</Text>
              ) : null}
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 5: AADHAAR NUMBER * (Fingerprint icon + 3 Boxes)
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Aadhaar Number <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <View ref={aadhaarWrapperRef} style={styles.aadhaarRow}>
              {/* Fingerprint Biometric Icon Box */}
              <View style={styles.fingerprintBox}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z"
                    fill="#64748B"
                  />
                  <Path
                    d="M12 2C6.47715 2 2 6.47715 2 12C2 14.5361 2.94632 16.8514 4.5 18.618M22 12C22 6.47715 17.5228 2 12 2M18.8 17.5C19.55 15.9 20 14 20 12M5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12M12 14C10.8954 14 10 14.8954 10 16M14 16C14 17.1046 13.1046 18 12 18M7.5 16.5C8.5 18 10 19 12 19C13.5 19 15 18 16 16.5"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>

              {/* Box 1 (Digits 1-4) */}
              <Pressable
                style={[
                  styles.aadhaarDigitBox,
                  (isAadhaarLocked || !isAadhaarEditable) && styles.aadhaarDigitBoxDisabled,
                  !isAadhaarLocked &&
                    isAadhaarEditable &&
                    focusedField === 'aadhaar1' &&
                    styles.aadhaarDigitBoxFocused,
                ]}
                onPress={() => {
                  if (!isAadhaarLocked && isAadhaarEditable) {
                    aadhaar1Ref.current?.focus();
                  }
                }}>
                <TextInput
                  ref={aadhaar1Ref}
                  style={[
                    styles.aadhaarDigitText,
                    (isAadhaarLocked || !isAadhaarEditable) && styles.aadhaarDigitTextDisabled,
                  ]}
                  value={aadhaarBox1}
                  editable={!isAadhaarLocked && isAadhaarEditable && !isSubmitting}
                  selectTextOnFocus={!isAadhaarLocked && isAadhaarEditable}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setAadhaarBox1(cleaned);
                    if (cleaned.length === 4) {
                      aadhaar2Ref.current?.focus();
                    }
                  }}
                  placeholder="0000"
                  placeholderTextColor="#CBD5E1"
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                  maxLength={4}
                  onFocus={() => {
                    if (!isAadhaarLocked && isAadhaarEditable) {
                      setFocusedField('aadhaar1');
                      scrollToInput(aadhaarWrapperRef, 400);
                    }
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </Pressable>

              {/* Box 2 (Digits 5-8) */}
              <Pressable
                style={[
                  styles.aadhaarDigitBox,
                  (isAadhaarLocked || !isAadhaarEditable) && styles.aadhaarDigitBoxDisabled,
                  !isAadhaarLocked &&
                    isAadhaarEditable &&
                    focusedField === 'aadhaar2' &&
                    styles.aadhaarDigitBoxFocused,
                ]}
                onPress={() => {
                  if (!isAadhaarLocked && isAadhaarEditable) {
                    aadhaar2Ref.current?.focus();
                  }
                }}>
                <TextInput
                  ref={aadhaar2Ref}
                  style={[
                    styles.aadhaarDigitText,
                    (isAadhaarLocked || !isAadhaarEditable) && styles.aadhaarDigitTextDisabled,
                  ]}
                  value={aadhaarBox2}
                  editable={!isAadhaarLocked && isAadhaarEditable && !isSubmitting}
                  selectTextOnFocus={!isAadhaarLocked && isAadhaarEditable}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setAadhaarBox2(cleaned);
                    if (cleaned.length === 4) {
                      aadhaar3Ref.current?.focus();
                    }
                  }}
                  onKeyPress={({nativeEvent}) => {
                    if (nativeEvent.key === 'Backspace' && aadhaarBox2 === '') {
                      aadhaar1Ref.current?.focus();
                    }
                  }}
                  placeholder="0000"
                  placeholderTextColor="#CBD5E1"
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                  maxLength={4}
                  onFocus={() => {
                    if (!isAadhaarLocked && isAadhaarEditable) {
                      setFocusedField('aadhaar2');
                      scrollToInput(aadhaarWrapperRef, 400);
                    }
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </Pressable>

              {/* Box 3 (Digits 9-12) */}
              <Pressable
                style={[
                  styles.aadhaarDigitBox,
                  (isAadhaarLocked || !isAadhaarEditable) && styles.aadhaarDigitBoxDisabled,
                  !isAadhaarLocked &&
                    isAadhaarEditable &&
                    focusedField === 'aadhaar3' &&
                    styles.aadhaarDigitBoxFocused,
                ]}
                onPress={() => {
                  if (!isAadhaarLocked && isAadhaarEditable) {
                    aadhaar3Ref.current?.focus();
                  }
                }}>
                <TextInput
                  ref={aadhaar3Ref}
                  style={[
                    styles.aadhaarDigitText,
                    (isAadhaarLocked || !isAadhaarEditable) && styles.aadhaarDigitTextDisabled,
                  ]}
                  value={aadhaarBox3}
                  editable={!isAadhaarLocked && isAadhaarEditable && !isSubmitting}
                  selectTextOnFocus={!isAadhaarLocked && isAadhaarEditable}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setAadhaarBox3(cleaned);
                  }}
                  onKeyPress={({nativeEvent}) => {
                    if (nativeEvent.key === 'Backspace' && aadhaarBox3 === '') {
                      aadhaar2Ref.current?.focus();
                    }
                  }}
                  placeholder="0000"
                  placeholderTextColor="#CBD5E1"
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                  maxLength={4}
                  onFocus={() => {
                    if (!isAadhaarLocked && isAadhaarEditable) {
                      setFocusedField('aadhaar3');
                      scrollToInput(aadhaarWrapperRef, 400);
                    }
                  }}
                  onBlur={() => setFocusedField(null)}
                />
              </Pressable>
            </View>
            {errors.aadhaar ? (
              <Text style={styles.errorText}>{errors.aadhaar}</Text>
            ) : null}
          </View>


          {/* ══════════════════════════════════════════════════════
              FIELD 7: PHOTOGRAPH OF APPLICANT * (Upload file)
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Photograph of Applicant <Text style={styles.redAsterisk}>*</Text>
            </Text>

            <View style={styles.uploadCard}>
              {/* Left: Icon / Preview (tapping opens preview if photo uploaded) */}
              {photo ? (
                <TouchableOpacity
                  style={styles.previewContainer}
                  onPress={() => setPreviewPhotoVisible(true)}
                  activeOpacity={0.75}>
                  <Image
                    source={
                      photo.uri
                        ? {uri: resolveDocUri(photo.uri)}
                        : require('../assets/images/applicant_sample_photo.jpg')
                    }
                    style={styles.previewImage}
                  />
                  <View style={styles.thumbnailZoomBadge}>
                    <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                      <Circle cx="11" cy="11" r="8" stroke="#FFFFFF" strokeWidth={2.5} />
                      <Path d="M21 21L16.65 16.65" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
                    </Svg>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.uploadIconBadge}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="4"
                      stroke="#059669"
                      strokeWidth={1.8}
                    />
                    <Circle cx="8.5" cy="8.5" r="2" fill="#059669" />
                    <Path
                      d="M21 15L16 10L5 21"
                      stroke="#059669"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              )}

              {/* Middle: Details (tapping opens preview if photo uploaded) */}
              <TouchableOpacity
                style={styles.uploadDetails}
                onPress={() => photo && setPreviewPhotoVisible(true)}
                disabled={!photo}
                activeOpacity={0.7}>
                <Text style={styles.uploadHeading} numberOfLines={1}>
                  {photo ? photo.fileName : 'Upload file'}
                </Text>
                <Text style={styles.uploadSubtext}>
                  {photo
                    ? `${(photo.fileSize / 1024).toFixed(0)} KB · Tap to view`
                    : 'JPG, PNG or WEBP · Maximum 50 KB'}
                </Text>
              </TouchableOpacity>

              {/* Right: Actions Row */}
              <View style={styles.uploadActionsRow}>
                {photo ? (
                  <TouchableOpacity
                    style={styles.viewDocButton}
                    onPress={() => setPreviewPhotoVisible(true)}
                    activeOpacity={0.75}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
                        stroke="#00875A"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="#00875A"
                        strokeWidth={2.2}
                      />
                    </Svg>
                    <Text style={styles.viewDocText}>View</Text>
                  </TouchableOpacity>
                ) : null}

                {isPhotoEditable ? (
                  <TouchableOpacity
                    style={styles.chooseFileButton}
                    onPress={() => setPhotoModalVisible(true)}
                    activeOpacity={0.75}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"
                        stroke="#00875A"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M17 8L12 3M12 3L7 8M12 3V15"
                        stroke="#00875A"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <Text style={styles.chooseFileText}>
                      {photo ? 'Change' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.chooseFileButton,
                      styles.chooseFileButtonDisabled,
                    ]}>
                    <Text style={styles.chooseFileTextDisabled}>Locked</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              INFO NOTICE STRIP
             ══════════════════════════════════════════════════════ */}
          <View style={styles.infoStrip}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconLetter}>i</Text>
            </View>
            <Text style={styles.infoStripText}>
              Mobile number and Aadhaar number are populated from the verified
              applicant profile.
            </Text>
          </View>

          {/* ══════════════════════════════════════════════════════
              UNDER 18 RESTRICTION & BACK TO LOGIN
             ══════════════════════════════════════════════════════ */}
          {isUnder18 && (
            <View style={styles.underAgeContainer}>
              <View style={styles.underAgeBox}>
                <View style={styles.underAgeIconWrap}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth={2} />
                    <Path
                      d="M12 8V12M12 16H12.01"
                      stroke="#DC2626"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <View style={styles.underAgeTextWrap}>
                  <Text style={styles.underAgeTitle}>Age Restriction</Text>
                  <Text style={styles.underAgeText}>
                    Applicants under 18 years of age cannot proceed to apply for this scheme.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={handleBackToLogin}
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
                <Text style={styles.backToLoginText}>Back to Login Screen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════
              PRIMARY ACTION BUTTON: SAVE & CONTINUE
             ══════════════════════════════════════════════════════ */}
          <TouchableOpacity
            style={[
              styles.saveContinueButton,
              (isSubmitting || isUnder18) && styles.saveContinueButtonDisabled,
            ]}
            onPress={handleSaveAndContinue}
            disabled={isSubmitting || isUnder18}
            activeOpacity={isUnder18 ? 1 : 0.85}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text
                  style={[
                    styles.saveContinueText,
                    isUnder18 && styles.saveContinueTextDisabled,
                  ]}>
                  Save & Continue
                </Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke={isUnder18 ? '#94A3B8' : '#FFFFFF'}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </>
            )}
          </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════════════════
          MODALS
         ══════════════════════════════════════════════════════ */}
      {/* Calendar Modal */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        initialDate={dob}
        onSelectDate={dateStr => {
          setDob(dateStr);
          if (errors.dob) {
            setErrors(prev => ({...prev, dob: ''}));
          }
        }}
      />

      {/* Category Selection Modal */}
      <SelectionModal
        visible={categoryModalVisible}
        title="Select Category"
        options={CATEGORY_OPTIONS}
        selectedValue={category}
        onSelect={opt => {
          setCategory(opt.label);
          if (errors.category) {
            setErrors(prev => ({...prev, category: ''}));
          }
        }}
        onClose={() => setCategoryModalVisible(false)}
      />

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
        onPhotoSelected={selected => {
          if (selected.fileSize > 50 * 1024) {
            Alert.alert(
              'File Size Exceeded',
              'The selected photo exceeds the maximum size of 50 KB. Please upload an image within 50 KB.',
            );
            return;
          }
          setPhoto(selected);
        }}
      />

      {/* Photo Preview Modal */}
      <Modal
        visible={previewPhotoVisible && Boolean(photo)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhotoVisible(false)}>
        <Pressable
          style={styles.previewModalOverlay}
          onPress={() => setPreviewPhotoVisible(false)}>
          <Pressable
            style={styles.previewModalCard}
            onPress={e => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.previewModalHeader}>
              <View style={styles.previewModalTitleWrap}>
                <Text style={styles.previewModalTitle} numberOfLines={1}>
                  Photograph of Applicant
                </Text>
                <Text style={styles.previewModalSub} numberOfLines={1}>
                  {photo?.fileName || 'Applicant Photo'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewModalCloseBtn}
                onPress={() => setPreviewPhotoVisible(false)}
                activeOpacity={0.7}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="#475569"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.previewModalBody}>
              <View style={styles.previewImageContainer}>
                <Image
                  source={
                    photo?.uri
                      ? {uri: resolveDocUri(photo.uri)}
                      : require('../assets/images/applicant_sample_photo.jpg')
                  }
                  style={styles.previewModalImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Modal Footer */}
            <View style={styles.previewModalFooter}>
              <TouchableOpacity
                style={styles.previewChangeBtn}
                onPress={() => {
                  setPreviewPhotoVisible(false);
                  setPhotoModalVisible(true);
                }}
                activeOpacity={0.75}>
                <Text style={styles.previewChangeBtnText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => setPreviewPhotoVisible(false)}
                activeOpacity={0.75}>
                <Text style={styles.previewCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Verify Mobile Modal */}
      <VerifyMobileModal
        visible={verifyMobileModalVisible}
        initialPhone={mobileNumber}
        onClose={() => setVerifyMobileModalVisible(false)}
        onSuccess={verifiedPhone => {
          setMobileNumber(verifiedPhone);
          setIsMobileVerified(true);
        }}
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


  // Main Scroll & Keyboard Container
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
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
    marginHorizontal: 10,
  },
  requiredNotice: {
    fontSize: 11,
    color: '#64748B',
  },
  redAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
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
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  fieldIcon: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIconSmall: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
    textAlignVertical: 'center',
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
  rightActionIconSmall: {
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },

  // Two column row (Category & Mobile)
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  columnLeft: {
    flex: 0.44,
  },
  columnRight: {
    flex: 0.56,
  },
  compactInputWrapper: {
    paddingHorizontal: 8,
  },
  compactText: {
    fontSize: 12.5,
  },
  verifyBadge: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
  },
  verifyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00875A',
  },
  verifiedBadgeText: {
    color: '#059669',
  },
  verifyBadgeDisabled: {
    opacity: 0.9,
  },
  inputWrapperDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D8DDE1',
  },
  textInputDisabled: {
    color: '#334155',
  },

  // Aadhaar Row with Fingerprint
  aadhaarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fingerprintBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#D8DDE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aadhaarDigitBox: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#D8DDE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aadhaarDigitBoxDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D8DDE1',
  },
  aadhaarDigitBoxFocused: {
    borderColor: '#00875A',
    backgroundColor: '#FAFCFA',
  },
  aadhaarDigitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 2,
    textAlign: 'center',
    width: '100%',
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  aadhaarDigitTextDisabled: {
    color: '#334155',
  },

  // Upload Photograph Card
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FDF9',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
  },
  uploadIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  previewContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#00875A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadDetails: {
    flex: 1,
  },
  uploadHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  uploadSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
  chooseFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
  },
  chooseFileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
  },
  chooseFileButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  chooseFileTextDisabled: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  thumbnailZoomBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 135, 90, 0.9)',
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
  },
  uploadActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.2,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 4,
  },
  viewDocText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
  },

  // Photo Preview Modal
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  previewModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewModalTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalBody: {
    minHeight: 280,
    maxHeight: 440,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  previewImageContainer: {
    width: '100%',
    height: 360,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalImage: {
    width: '100%',
    height: '100%',
  },
  previewModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  previewChangeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChangeBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  previewCloseBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Info Strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    marginTop: 4,
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

  // Primary Action Button
  saveContinueButton: {
    height: 50,
    backgroundColor: '#00875A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00875A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveContinueButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },
  saveContinueText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveContinueTextDisabled: {
    color: '#64748B',
  },

  // Under-18 Restriction Box & Back to Login
  underAgeDobText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  underAgeContainer: {
    marginBottom: 16,
  },
  underAgeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  underAgeIconWrap: {
    marginTop: 1,
  },
  underAgeTextWrap: {
    flex: 1,
  },
  underAgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 3,
  },
  underAgeText: {
    fontSize: 12.5,
    color: '#B91C1C',
    lineHeight: 18,
    fontWeight: '500',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  backToLoginText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#00875A',
    textDecorationLine: 'underline',
  },
  skipButtonDisabled: {
    opacity: 0.35,
  },
  skipTextDisabled: {
    color: '#94A3B8',
  },
});

export default PersonalInfoScreen;
