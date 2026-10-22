/**
 * SHGDetailsScreen — Self Help Group Membership Details Screen
 * Step between Personal Information and Address Details.
 *
 * Implements:
 * - Name of SHG (required)
 * - SHG ID Number (required)
 * - Date of Formation of SHG (required, calendar picker)
 * - SHG Certificate / Membership Proof upload (required, <= 200 KB)
 * - SHG Bank Passbook Copy upload (required, <= 200 KB)
 * - Multi-part form submission to POST /api/loan/shg
 */
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

import {RootStackScreenProps} from '../types/navigation';
import {isFieldEditable} from '../utils/fieldPermissions';
import {
  Logo,
  CalendarModal,
  DocumentUploadModal,
  SelectionModal,
  useToast,
  WatermarkBackground,
} from '../components';
import {SelectedDocument} from '../components/DocumentUploadModal';
import {
  getLoanId,
  getStoredLoanDetails,
  setStoredLoanDetails,
} from '../services/storage';
import {getLoanDetailsAuth, submitSHGDetails} from '../api/loan';
import {checkInternetConnection, showNoInternetAlert} from '../utils';

type Props = RootStackScreenProps<'SHGDetails'>;

// Format raw date (ISO or YYYY-MM-DD or DD-MM-YYYY) to DD-MM-YYYY for display
const formatDisplayDate = (raw?: string | null): string => {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }
  const dateOnly = str.split('T')[0];
  if (dateOnly.includes('-')) {
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {}
  return str;
};

const resolveDocUri = (val?: any): string => {
  if (!val) return '';
  if (typeof val === 'object' && (val.uri || val.url)) {
    return val.uri || val.url;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('file://') ||
      trimmed.startsWith('data:')
    ) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return `https://api.wemanipur.com${trimmed}`;
    }
    return `https://api.wemanipur.com/uploads/${trimmed}`;
  }
  return '';
};

const isImageFile = (doc?: SelectedDocument | null): boolean => {
  if (!doc || !doc.uri) return false;
  const uri = resolveDocUri(doc.uri).toLowerCase();
  const name = (doc.fileName || '').toLowerCase();
  const type = (doc.type || '').toLowerCase();
  if (type.includes('image')) return true;
  if (type.includes('pdf') || uri.endsWith('.pdf') || name.endsWith('.pdf')) {
    return false;
  }
  return (
    uri.endsWith('.jpg') ||
    uri.endsWith('.jpeg') ||
    uri.endsWith('.png') ||
    uri.endsWith('.webp') ||
    uri.endsWith('.gif') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif')
  );
};

type ScrollViewInstance = React.ElementRef<typeof ScrollView>;
type TextInputInstance = React.ElementRef<typeof TextInput>;
type ViewInstance = React.ElementRef<typeof View>;

const SHGDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const toast = useToast();

  // ─── Form State ──────────────────────────────────────────────
  const [loanId, setLoanIdState] = useState<string>('');
  const [loanStatus, setLoanStatus] = useState<string>(
    route.params?.loanStatus || '',
  );
  const [fieldList, setFieldList] = useState<any>(
    route.params?.fieldList || null,
  );
  const [shgName, setShgName] = useState<string>('');
  const [shgId, setShgId] = useState<string>('');
  const [dateOfFormation, setDateOfFormation] = useState<string>(''); // DD-MM-YYYY
  const [certificate, setCertificate] = useState<SelectedDocument | null>(null);
  const [bankCopy, setBankCopy] = useState<SelectedDocument | null>(null);

  // Field Edit Permissions (if rejected, only allow fields in fieldList)
  const isShgNameEditable = isFieldEditable('shgName', fieldList, loanStatus);
  const isShgIdEditable = isFieldEditable('shgId', fieldList, loanStatus);
  const isDateOfFormationEditable = isFieldEditable(
    'dateOfFormation',
    fieldList,
    loanStatus,
  );
  const isCertificateEditable = isFieldEditable(
    'certificate',
    fieldList,
    loanStatus,
  );
  const isBankCopyEditable = isFieldEditable('bankCopy', fieldList, loanStatus);

  // ─── UI & Interaction State ─────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  // Modals
  const [calendarVisible, setCalendarVisible] = useState<boolean>(false);
  const [certificateModalVisible, setCertificateModalVisible] =
    useState<boolean>(false);
  const [bankCopyModalVisible, setBankCopyModalVisible] =
    useState<boolean>(false);

  // Document Viewer Modal State
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    doc: SelectedDocument;
  } | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  const handleOpenPreview = (doc: SelectedDocument | null, title: string) => {
    if (!doc) return;
    setImageLoadError(false);
    setViewingDoc({title, doc});
  };

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Input Refs
  const shgNameRef = useRef<TextInputInstance | null>(null);
  const shgNameWrapperRef = useRef<ViewInstance | null>(null);
  const shgIdRef = useRef<TextInputInstance | null>(null);
  const shgIdWrapperRef = useRef<ViewInstance | null>(null);
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

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

  // Helper to populate form fields from SHG details object
  const populateFromSHG = useCallback((data: any) => {
    if (!data) return;

    if (data.shgName || data.name) {
      setShgName(String(data.shgName || data.name));
    }
    if (data.shgId || data.idNumber || data.shgIdNumber) {
      setShgId(String(data.shgId || data.idNumber || data.shgIdNumber));
    }
    const rawDate = data.dateOfFormation || data.formationDate;
    if (rawDate) {
      setDateOfFormation(formatDisplayDate(rawDate));
    }

    // Pre-fill Certificate if available
    const rawCert = data.certificate || data.shgCertificate;
    if (rawCert) {
      if (typeof rawCert === 'string' && rawCert.trim().length > 0) {
        const fileName =
          rawCert.split('/').pop()?.split('?')[0] || 'SHG_Certificate.png';
        setCertificate({
          uri: rawCert,
          fileName,
          fileSize: 102400,
          type: 'image/png',
        });
      } else if (typeof rawCert === 'object' && (rawCert.uri || rawCert.url)) {
        const uri = rawCert.uri || rawCert.url;
        setCertificate({
          uri,
          fileName:
            rawCert.fileName ||
            rawCert.name ||
            uri.split('/').pop()?.split('?')[0] ||
            'SHG_Certificate.png',
          fileSize: rawCert.fileSize || 102400,
          type: rawCert.type || 'image/png',
        });
      }
    }

    // Pre-fill Bank Copy if available
    const rawBank = data.bankCopy || data.shgBankCopy || data.bankPassbook;
    if (rawBank) {
      if (typeof rawBank === 'string' && rawBank.trim().length > 0) {
        const fileName =
          rawBank.split('/').pop()?.split('?')[0] || 'Bank_Passbook.png';
        setBankCopy({
          uri: rawBank,
          fileName,
          fileSize: 102400,
          type: 'image/png',
        });
      } else if (typeof rawBank === 'object' && (rawBank.uri || rawBank.url)) {
        const uri = rawBank.uri || rawBank.url;
        setBankCopy({
          uri,
          fileName:
            rawBank.fileName ||
            rawBank.name ||
            uri.split('/').pop()?.split('?')[0] ||
            'Bank_Passbook.png',
          fileSize: rawBank.fileSize || 102400,
          type: rawBank.type || 'image/png',
        });
      }
    }
  }, []);

  // ─── Load Stored Details / Loan ID on Mount ─────────────────
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      try {
        const paramLoanId = route.params?.loanId;
        const storedLoanId = await getLoanId();
        const storedDetails = await getStoredLoanDetails<any>();

        if (storedDetails && isMounted) {
          if (storedDetails.loanStatus && !route.params?.loanStatus) {
            setLoanStatus(storedDetails.loanStatus);
          }
          if (storedDetails.fieldList && !route.params?.fieldList) {
            setFieldList(storedDetails.fieldList);
          }
        }

        const activeId =
          paramLoanId ||
          storedLoanId ||
          storedDetails?.id ||
          'b69488e4-3d79-4688-b80f-2e01a8a562ba';

        if (isMounted) {
          setLoanIdState(activeId);
        }

        // 1. Immediately pre-fill from route params if passed
        const routeSHG =
          route.params?.shgDetails ||
          route.params?.loanDetails?.SHGDetails ||
          route.params?.loanDetails?.shgDetails;
        if (routeSHG) {
          populateFromSHG(routeSHG);
        }

        // 2. Pre-fill from cached stored details
        const cachedSHG =
          storedDetails?.SHGDetails ||
          storedDetails?.shgDetails ||
          storedDetails?.shg ||
          (storedDetails?.shgName ? storedDetails : null);

        if (cachedSHG && isMounted) {
          populateFromSHG(cachedSHG);
        }

        // 3. Fetch fresh details from API
        if (activeId) {
          try {
            const res = await getLoanDetailsAuth(activeId);
            if (isMounted && res && res.success && res.data) {
              if (res.data.loanStatus && !route.params?.loanStatus) {
                setLoanStatus(res.data.loanStatus);
              }
              if (res.data.fieldList && !route.params?.fieldList) {
                setFieldList(res.data.fieldList);
              }
              const freshSHG = res.data.SHGDetails || res.data.shgDetails;
              if (freshSHG) {
                populateFromSHG(freshSHG);
              }
              await setStoredLoanDetails(res.data);
            }
          } catch (apiErr) {
            console.warn('[SHGDetails] API fetch failed, using cached data:', apiErr);
          }
        }
      } catch (err) {
        console.error('[SHGDetails] Error initializing data:', err);
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [route.params?.loanId, route.params?.shgDetails, populateFromSHG]);

  // ─── Validation ──────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!shgName.trim()) {
      newErrors.shgName = 'Name of SHG is required';
    }

    if (!shgId.trim()) {
      newErrors.shgId = 'SHG ID number is required';
    }

    if (!dateOfFormation.trim()) {
      newErrors.dateOfFormation = 'Date of formation of SHG is required';
    }

    if (!certificate) {
      newErrors.certificate = 'SHG certificate / membership proof is required';
    }

    if (!bankCopy) {
      newErrors.bankCopy = 'SHG bank passbook copy is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }

    return true;
  };

  // ─── Format Date to YYYY-MM-DD for API ───────────────────────
  const formatApiDate = (dateStr: string): string => {
    if (!dateStr.includes('-')) {
      return dateStr;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // If DD-MM-YYYY -> YYYY-MM-DD
      if (parts[0].length === 2 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
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
      const apiDateOfFormation = formatApiDate(dateOfFormation);
      const activeLoanId =
        loanId ||
        route.params?.loanId ||
        (await getLoanId()) ||
        'b69488e4-3d79-4688-b80f-2e01a8a562ba';

      const response = await submitSHGDetails({
        loanId: activeLoanId,
        shgName: shgName.trim(),
        shgId: shgId.trim() || undefined,
        dateOfFormation: apiDateOfFormation,
        certificate: certificate
          ? {
              uri: certificate.uri,
              fileName: certificate.fileName,
              type: certificate.type,
            }
          : null,
        bankCopy: bankCopy
          ? {
              uri: bankCopy.uri,
              fileName: bankCopy.fileName,
              type: bankCopy.type,
            }
          : null,
      });

      if (response && response.success) {
        toast.success(response.message || 'SHG details saved successfully');

        // Update stored loan details
        try {
          const stored = (await getStoredLoanDetails<any>()) || {};
          await setStoredLoanDetails({
            ...stored,
            shgName: shgName.trim(),
            shgId: shgId.trim(),
            dateOfFormation: apiDateOfFormation,
            SHGDetails: {
              ...(stored.SHGDetails || {}),
              shgName: shgName.trim(),
              shgId: shgId.trim(),
              dateOfFormation: apiDateOfFormation,
              certificate: certificate?.uri || stored.SHGDetails?.certificate,
              bankCopy: bankCopy?.uri || stored.SHGDetails?.bankCopy,
            },
            ...(response.data || {}),
          });
        } catch (e) {
          console.warn('[SHGDetails] Failed to cache SHG details:', e);
        }

        // Navigate to Address Details
        navigation.navigate('AddressDetails', {
          loanId: activeLoanId,
          applicationNumber:
            response.data?.applicationNumber ||
            route.params?.applicationNumber,
          fieldList: fieldList || response.data?.fieldList,
          loanStatus: loanStatus || response.data?.loanStatus,
          isEdit: route.params?.isEdit,
        });
      } else {
        const errorMsg = response?.message || 'Failed to submit SHG details';
        toast.error(errorMsg);
        Alert.alert('Submission Error', errorMsg);
      }
    } catch (err: any) {
      console.error('[SHGDetails] Submit error:', err);
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
        'Unable to submit SHG details. Please try again.';
      toast.error(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handle Back ─────────────────────────────────────────────
  const handleBack = () => {
    navigation.goBack();
  };

  // ─── Handle Skip ─────────────────────────────────────────────
  const handleSkip = () => {
    navigation.navigate('MainTabs', {screen: 'Home'} as any);
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

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
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
          {/* ══════════════════════════════════════════════════════
              HEADER TITLE & SUBTITLE
             ══════════════════════════════════════════════════════ */}
          <View style={styles.screenHeader}>
            <Text style={styles.screenTitle}>SHG Details</Text>
            <Text style={styles.screenSubtitle}>
              Provide the applicant's Self Help Group membership details.
            </Text>
          </View>

          {/* ══════════════════════════════════════════════════════
              SECTION DIVIDER: SHG MEMBERSHIP
             ══════════════════════════════════════════════════════ */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SHG Membership</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 1: NAME OF SHG *
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Name of SHG <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <Pressable
              ref={shgNameWrapperRef}
              style={[
                styles.inputWrapper,
                focusedField === 'shgName' && styles.inputWrapperFocused,
                Boolean(errors.shgName) && styles.inputWrapperError,
                !isShgNameEditable && styles.inputWrapperDisabled,
              ]}
              onPress={() => {
                if (isShgNameEditable) {
                  shgNameRef.current?.focus();
                }
              }}>
              <View style={styles.fieldIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                  <Circle
                    cx="12"
                    cy="11"
                    r="3.5"
                    stroke="#64748B"
                    strokeWidth={1.8}
                  />
                </Svg>
              </View>
              <TextInput
                ref={shgNameRef}
                style={[
                  styles.textInput,
                  !isShgNameEditable && styles.textInputDisabled,
                ]}
                value={shgName}
                editable={isShgNameEditable && !isSubmitting}
                onChangeText={text => {
                  setShgName(text);
                  if (errors.shgName) {
                    setErrors(prev => ({...prev, shgName: ''}));
                  }
                }}
                placeholder="Enter SHG name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => {
                  if (isShgNameEditable) {
                    setFocusedField('shgName');
                    scrollToInput(shgNameWrapperRef, 120);
                  }
                }}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
            {errors.shgName ? (
              <Text style={styles.errorText}>{errors.shgName}</Text>
            ) : null}
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 2: SHG ID NUMBER *
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              SHG ID Number <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <Pressable
              ref={shgIdWrapperRef}
              style={[
                styles.inputWrapper,
                focusedField === 'shgId' && styles.inputWrapperFocused,
                Boolean(errors.shgId) && styles.inputWrapperError,
                !isShgIdEditable && styles.inputWrapperDisabled,
              ]}
              onPress={() => {
                if (isShgIdEditable) {
                  shgIdRef.current?.focus();
                }
              }}>
              <View style={styles.fieldIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M14 2V8H20"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M16 13H8M16 17H8M10 9H8"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <TextInput
                ref={shgIdRef}
                style={[
                  styles.textInput,
                  !isShgIdEditable && styles.textInputDisabled,
                ]}
                value={shgId}
                editable={isShgIdEditable && !isSubmitting}
                onChangeText={text => {
                  setShgId(text);
                  if (errors.shgId) {
                    setErrors(prev => ({...prev, shgId: ''}));
                  }
                }}
                placeholder="Enter SHG ID number"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                returnKeyType="next"
                onFocus={() => {
                  if (isShgIdEditable) {
                    setFocusedField('shgId');
                    scrollToInput(shgIdWrapperRef, 200);
                  }
                }}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
            {errors.shgId ? (
              <Text style={styles.errorText}>{errors.shgId}</Text>
            ) : null}
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 3: DATE OF FORMATION OF SHG *
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Date of Formation of SHG <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.inputWrapper,
                focusedField === 'dateOfFormation' &&
                  styles.inputWrapperFocused,
                Boolean(errors.dateOfFormation) && styles.inputWrapperError,
                !isDateOfFormationEditable && styles.inputWrapperDisabled,
              ]}
              disabled={!isDateOfFormationEditable || isSubmitting}
              onPress={() => isDateOfFormationEditable && setCalendarVisible(true)}
              activeOpacity={0.85}>
              <View style={styles.fieldIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="#64748B"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M16 2V6M8 2V6M3 10H21"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text
                style={[
                  styles.pressableText,
                  !dateOfFormation && styles.placeholderText,
                ]}>
                {dateOfFormation || 'DD-MM-YYYY'}
              </Text>
              <View style={styles.rightActionIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="#334155"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M16 2V6M8 2V6M3 10H21"
                    stroke="#334155"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            </TouchableOpacity>
            {errors.dateOfFormation ? (
              <Text style={styles.errorText}>{errors.dateOfFormation}</Text>
            ) : null}
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 4: SHG CERTIFICATE / MEMBERSHIP PROOF *
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              SHG Certificate / Membership Proof{' '}
              <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <View
              style={[
                styles.uploadBox,
                Boolean(errors.certificate) && styles.uploadBoxError,
              ]}>
              {/* Left: Thumbnail Preview or Icon Badge */}
              {certificate && isImageFile(certificate) ? (
                <TouchableOpacity
                  style={styles.uploadThumbnailWrap}
                  onPress={() =>
                    handleOpenPreview(certificate, 'SHG Certificate / Proof')
                  }
                  activeOpacity={0.8}>
                  <Image
                    source={{uri: resolveDocUri(certificate.uri)}}
                    style={styles.uploadThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.thumbnailZoomBadge}>
                    <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
                        stroke="#FFFFFF"
                        strokeWidth={2.2}
                      />
                      <Circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth={2.2} />
                    </Svg>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.uploadIconBadge}
                  onPress={() =>
                    certificate &&
                    handleOpenPreview(certificate, 'SHG Certificate / Proof')
                  }
                  activeOpacity={certificate ? 0.75 : 1}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
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
                </TouchableOpacity>
              )}

              {/* Middle: Details (tapping opens preview if uploaded) */}
              <TouchableOpacity
                style={styles.uploadDetails}
                onPress={() =>
                  certificate &&
                  handleOpenPreview(certificate, 'SHG Certificate / Proof')
                }
                disabled={!certificate}
                activeOpacity={0.7}>
                <Text style={styles.uploadHeading} numberOfLines={1}>
                  {certificate ? certificate.fileName : 'Upload file'}
                </Text>
                <Text style={styles.uploadSubtext}>
                  {certificate
                    ? `${(certificate.fileSize / 1024).toFixed(0)} KB · Tap to view`
                    : 'JPG, PNG or PDF - Maximum 200 KB'}
                </Text>
              </TouchableOpacity>

              {/* Right: Actions Row */}
              <View style={styles.uploadActionsRow}>
                {certificate ? (
                  <TouchableOpacity
                    style={styles.viewDocButton}
                    onPress={() =>
                      handleOpenPreview(certificate, 'SHG Certificate / Proof')
                    }
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

                {isCertificateEditable ? (
                  <TouchableOpacity
                    style={styles.chooseFileButton}
                    onPress={() => setCertificateModalVisible(true)}
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
                      {certificate ? 'Change' : 'Choose File'}
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
            {errors.certificate ? (
              <Text style={styles.errorText}>{errors.certificate}</Text>
            ) : null}
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 5: SHG BANK PASSBOOK COPY *
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              SHG Bank Passbook Copy <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <View
              style={[
                styles.uploadBox,
                Boolean(errors.bankCopy) && styles.uploadBoxError,
              ]}>
              {/* Left: Thumbnail Preview or Icon Badge */}
              {bankCopy && isImageFile(bankCopy) ? (
                <TouchableOpacity
                  style={styles.uploadThumbnailWrap}
                  onPress={() =>
                    handleOpenPreview(bankCopy, 'SHG Bank Passbook Copy')
                  }
                  activeOpacity={0.8}>
                  <Image
                    source={{uri: resolveDocUri(bankCopy.uri)}}
                    style={styles.uploadThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.thumbnailZoomBadge}>
                    <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
                        stroke="#FFFFFF"
                        strokeWidth={2.2}
                      />
                      <Circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth={2.2} />
                    </Svg>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.uploadIconBadge}
                  onPress={() =>
                    bankCopy &&
                    handleOpenPreview(bankCopy, 'SHG Bank Passbook Copy')
                  }
                  activeOpacity={bankCopy ? 0.75 : 1}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
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
                </TouchableOpacity>
              )}

              {/* Middle: Details (tapping opens preview if uploaded) */}
              <TouchableOpacity
                style={styles.uploadDetails}
                onPress={() =>
                  bankCopy &&
                  handleOpenPreview(bankCopy, 'SHG Bank Passbook Copy')
                }
                disabled={!bankCopy}
                activeOpacity={0.7}>
                <Text style={styles.uploadHeading} numberOfLines={1}>
                  {bankCopy ? bankCopy.fileName : 'Upload file'}
                </Text>
                <Text style={styles.uploadSubtext}>
                  {bankCopy
                    ? `${(bankCopy.fileSize / 1024).toFixed(0)} KB · Tap to view`
                    : 'JPG, PNG or PDF - Maximum 200 KB'}
                </Text>
              </TouchableOpacity>

              {/* Right: Actions Row */}
              <View style={styles.uploadActionsRow}>
                {bankCopy ? (
                  <TouchableOpacity
                    style={styles.viewDocButton}
                    onPress={() =>
                      handleOpenPreview(bankCopy, 'SHG Bank Passbook Copy')
                    }
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

                {isBankCopyEditable ? (
                  <TouchableOpacity
                    style={styles.chooseFileButton}
                    onPress={() => setBankCopyModalVisible(true)}
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
                      {bankCopy ? 'Change' : 'Choose File'}
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
            {errors.bankCopy ? (
              <Text style={styles.errorText}>{errors.bankCopy}</Text>
            ) : null}
          </View>

          {/* ══════════════════════════════════════════════════════
              INFO NOTICE STRIP
             ══════════════════════════════════════════════════════ */}
          <View style={styles.infoStrip}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconLetter}>i</Text>
            </View>
            <Text style={styles.infoStripText}>
              Upload both SHG identification documents: certificate/membership
              proof and bank passbook copy.
            </Text>
          </View>

          {/* ══════════════════════════════════════════════════════
              BOTTOM ACTION BUTTONS (Back + Save & Continue)
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
      {/* Date of Formation Calendar Modal */}
      <CalendarModal
        visible={calendarVisible}
        title="SELECT DATE OF FORMATION"
        initialDate={dateOfFormation}
        defaultToCurrentYear={true}
        onSelectDate={d => {
          setDateOfFormation(d);
          if (errors.dateOfFormation) {
            setErrors(prev => ({...prev, dateOfFormation: ''}));
          }
        }}
        onClose={() => setCalendarVisible(false)}
      />

      {/* SHG Certificate Upload Modal */}
      <DocumentUploadModal
        visible={certificateModalVisible}
        title="SHG Certificate / Proof"
        subtitle="JPG, PNG or PDF · Maximum 200 KB"
        sampleFileName="certificate.png"
        maxSizeKb={200}
        onDocumentSelected={doc => {
          setCertificate(doc);
          if (errors.certificate) {
            setErrors(prev => ({...prev, certificate: ''}));
          }
        }}
        onClose={() => setCertificateModalVisible(false)}
      />

      {/* SHG Bank Passbook Upload Modal */}
      <DocumentUploadModal
        visible={bankCopyModalVisible}
        title="SHG Bank Passbook Copy"
        subtitle="JPG, PNG or PDF · Maximum 200 KB"
        sampleFileName="bankCopy.png"
        maxSizeKb={200}
        onDocumentSelected={doc => {
          setBankCopy(doc);
          if (errors.bankCopy) {
            setErrors(prev => ({...prev, bankCopy: ''}));
          }
        }}
        onClose={() => setBankCopyModalVisible(false)}
      />

      {/* ══════════════════════════════════════════════════════
          DOCUMENT PREVIEW MODAL
         ══════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(viewingDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setViewingDoc(null);
          setImageLoadError(false);
        }}>
        <Pressable
          style={styles.previewModalOverlay}
          onPress={() => {
            setViewingDoc(null);
            setImageLoadError(false);
          }}>
          <Pressable
            style={styles.previewModalCard}
            onPress={e => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.previewModalHeader}>
              <View style={styles.previewModalTitleWrap}>
                <Text style={styles.previewModalTitle} numberOfLines={1}>
                  {viewingDoc?.title}
                </Text>
                <Text style={styles.previewModalSub} numberOfLines={1}>
                  {viewingDoc?.doc.fileName}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewModalCloseBtn}
                onPress={() => {
                  setViewingDoc(null);
                  setImageLoadError(false);
                }}
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
              {viewingDoc && isImageFile(viewingDoc.doc) && !imageLoadError ? (
                <View style={styles.previewImageContainer}>
                  <Image
                    source={{uri: resolveDocUri(viewingDoc.doc.uri)}}
                    style={styles.previewModalImage}
                    resizeMode="contain"
                    onError={() => setImageLoadError(true)}
                  />
                </View>
              ) : (
                <View style={styles.previewDocFallback}>
                  <View style={styles.previewDocIconCircle}>
                    <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                        stroke="#DC2626"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M14 2V8H20"
                        stroke="#DC2626"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M16 13H8M16 17H8M10 9H8"
                        stroke="#DC2626"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.previewDocFallbackName} numberOfLines={2}>
                    {viewingDoc?.doc.fileName}
                  </Text>
                  <View style={styles.previewDocStatusBadge}>
                    <Text style={styles.previewDocStatusText}>
                      Document Attached
                    </Text>
                  </View>
                  <Text style={styles.previewDocFallbackSize}>
                    {(Number(viewingDoc?.doc.fileSize || 0) / 1024).toFixed(0)} KB · Ready to submit
                  </Text>
                </View>
              )}
            </View>

            {/* Modal Footer */}
            <View style={styles.previewModalFooter}>
              <TouchableOpacity
                style={styles.previewChangeBtn}
                onPress={() => {
                  const currentTitle = viewingDoc?.title || '';
                  setViewingDoc(null);
                  setImageLoadError(false);
                  if (currentTitle.includes('Certificate')) {
                    setCertificateModalVisible(true);
                  } else {
                    setBankCopyModalVisible(true);
                  }
                }}
                activeOpacity={0.75}>
                <Text style={styles.previewChangeBtnText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => {
                  setViewingDoc(null);
                  setImageLoadError(false);
                }}
                activeOpacity={0.75}>
                <Text style={styles.previewCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

  // Main Scroll Container
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36,
  },

  // Screen Header Title & Subtitle
  screenHeader: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 18,
  },

  // Section Header: SHG Membership
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00875A',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#B6E3CB',
    marginLeft: 12,
  },

  // Field Group
  fieldGroup: {
    marginBottom: 16,
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
    shadowOffset: {width: 0, height: 1},
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

  // Document Upload Cards
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FCF9',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#D1FAE5',
    padding: 12,
  },
  uploadBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  uploadIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadDetails: {
    flex: 1,
    marginRight: 8,
  },
  uploadHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 3,
  },
  uploadSubtext: {
    fontSize: 11.5,
    color: '#64748B',
  },
  chooseFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  chooseFileText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#00875A',
  },
  chooseFileButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  chooseFileTextDisabled: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  uploadActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadThumbnailWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    borderWidth: 1.2,
    borderColor: '#86EFAC',
    position: 'relative',
  },
  uploadThumbnail: {
    width: '100%',
    height: '100%',
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
    fontSize: 12.5,
    fontWeight: '600',
    color: '#00875A',
  },

  // Document Preview Modal
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
  previewDocFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  previewDocIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  previewDocFallbackName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewDocStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  previewDocStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  previewDocFallbackSize: {
    fontSize: 12,
    color: '#64748B',
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

  // Info Notice Strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 4,
    marginBottom: 24,
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
    fontSize: 12.5,
    color: '#1E40AF',
    lineHeight: 18,
  },

  // Bottom Buttons Row
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
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
    shadowOffset: {width: 0, height: 2},
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

export default SHGDetailsScreen;
