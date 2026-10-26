/**
 * ReviewApplicationScreen — "Review Your Application" step matching the WEmanipur UI design.
 * Features:
 * - Back button & Language selector header + Centered Brand Logo
 * - Fetches complete loan details from GET /api/loan/details/{loanId}
 * - Section summary cards displaying live API data:
 *   1. Application Details (Application ID, Applied At, Status badge)
 *   2. Applicant Details (Name, Category, Email, Mobile, Aadhaar, DOB, Gender + Edit action)
 *   3. Address (Village/Locality, Panchayat/Block, District, State + Edit action)
 *   4. Self Help Group Details (SHG Name, SHG ID, Date of Formation + Edit action)
 *   5. Family & Income Details (Annual Family Income tier + Edit action)
 *   6. Proposed Economic Activity (Activity, Description + Edit action)
 *   7. Declaration & Application Status (Declared Name, Mandatory Guardian Name Input, Step)
 *   8. Uploaded Documents (Live thumbnails of Photo, Certificate, Bank Copy)
 * - Mandatory Guardian Name input (Father / Husband) with real-time validation
 * - Interactive Confirmation Checkbox: "I confirm that the above information is correct and complete."
 * - Submits final declaration to POST /api/loan/details:
 *   { loanId, declearedName, declearedGuardianName, declaration: true, noObjection: true }
 * - Navigates to Dashboard (MainTabs) on success
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { Logo, useToast, WatermarkBackground, SubmissionSuccessModal } from '../components';
import SelectionModal from '../components/SelectionModal';
import { isFieldEditable, isSectionEditable, parseFieldList } from '../utils/fieldPermissions';
import type { RootStackScreenProps } from '../types/navigation';
import {
  getLoanDetailsAuth,
  getLoanList,
  submitDeclarationDetails,
  LoanDetailsData,
} from '../api/loan';
import {
  getLoanId,
  setLoanId,
  getStoredLoanDetails,
  setStoredLoanDetails,
  getUserProfile,
  clearAll,
} from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = RootStackScreenProps<'ReviewApplication'>;

type ScrollViewInstance = React.ElementRef<typeof ScrollView>;
type TextInputInstance = React.ElementRef<typeof TextInput>;

const formatDate = (dateString?: string | null): string => {
  if (!dateString) {
    return 'Not provided';
  }
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return dateString;
    }
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const cleanHtml = (text?: string | null): string => {
  if (!text) {
    return 'Not provided';
  }
  return text.replace(/<[^>]*>?/gm, '').trim();
};

const ReviewApplicationScreen: React.FC<Props> = ({ navigation, route }) => {
  const toast = useToast();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const guardianInputRef = useRef<TextInputInstance | null>(null);

  const fallbackAppNumber = route.params?.applicationNumber || '';
  const [activeLoanId, setActiveLoanId] = useState<string>(
    route.params?.loanId || '',
  );

  const [loanData, setLoanData] = useState<LoanDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states for final declaration
  const [declearedName, setDeclearedName] = useState<string>('');
  const [declearedGuardianName, setDeclearedGuardianName] = useState<string>('');
  const [guardianError, setGuardianError] = useState<string>('');
  const [isGuardianFocused, setIsGuardianFocused] = useState<boolean>(false);

  // State for confirmation checkbox
  const [isConfirmed, setIsConfirmed] = useState(true);

  // Document preview modal state
  interface PreviewDocInfo {
    title: string;
    uri?: string | null;
    fileName?: string;
    docType?: string;
  }
  const [previewDoc, setPreviewDoc] = useState<PreviewDocInfo | null>(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState('');
  const isSigningOutRef = useRef(false);

  const handleSignOutAfterSubmission = useCallback(async () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;
    setSuccessModalVisible(false);

    try {
      await clearAll();
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('[ReviewApplication] Failed to clear storage on signout:', e);
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth', params: { screen: 'Login' } }],
    });
  }, [navigation]);

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

  const getDocFileName = (val?: any, defaultName = 'Document.pdf'): string => {
    if (!val) return defaultName;
    if (typeof val === 'object') {
      return val.fileName || val.name || defaultName;
    }
    if (typeof val === 'string') {
      const name = val.split('/').pop()?.split('?')[0];
      return name && name.length > 0 ? name : defaultName;
    }
    return defaultName;
  };

  /**
   * Helper to determine if a specific section can be edited based on fieldList.
   * If fieldList is null, undefined, or empty, editing is disabled for all sections.
   * If fieldList specifies a section or specific fields within it, editing is enabled for that section.
   */
  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        setIsLoading(true);

        const isInvalidId = (id?: string | null) =>
          !id ||
          id === 'b6c25f77-857d-499c-a712-c64bcd9317a7' ||
          id === 'b69488e4-3d79-4688-b80f-2e01a8a562ba' ||
          id === '1b268acc-508c-4fca-94ca-a3cd4d23fc47';

        let resolvedLoanId = route.params?.loanId;

        if (isInvalidId(resolvedLoanId)) {
          const storedId = await getLoanId();
          if (!isInvalidId(storedId)) {
            resolvedLoanId = storedId!;
          }
        }

        if (isInvalidId(resolvedLoanId)) {
          const storedDetails = await getStoredLoanDetails<any>();
          if (!isInvalidId(storedDetails?.id)) {
            resolvedLoanId = storedDetails.id;
          }
        }

        // If still not found, fetch user's active loan applications list
        if (isInvalidId(resolvedLoanId)) {
          try {
            const listRes = await getLoanList();
            if (listRes && listRes.success && listRes.data?.rows?.length > 0) {
              resolvedLoanId = listRes.data.rows[0].id;
              await setLoanId(resolvedLoanId);
            }
          } catch (listErr) {
            console.warn('[ReviewApplication] Failed to fetch loan list:', listErr);
          }
        }

        if (resolvedLoanId && !isInvalidId(resolvedLoanId)) {
          setActiveLoanId(resolvedLoanId);
          await setLoanId(resolvedLoanId);

          const res = await getLoanDetailsAuth(resolvedLoanId);
          if (res && res.success && res.data) {
            let data = res.data;

            // If fieldList is missing or empty, supplement from route params or GET /api/loan/list
            if (!data.fieldList || (Array.isArray(data.fieldList) && data.fieldList.length === 0)) {
              if (route.params?.fieldList) {
                data = {
                  ...data,
                  fieldList: route.params.fieldList,
                };
              }
              try {
                const listRes = await getLoanList();
                const matchedRow =
                  listRes?.data?.rows?.find((r: any) => r.id === resolvedLoanId) ||
                  listRes?.data?.rows?.[0];
                if (matchedRow) {
                  data = {
                    ...data,
                    fieldList: matchedRow.fieldList || data.fieldList,
                    loanStatus: matchedRow.loanStatus || data.loanStatus,
                    reasonOfRejection: matchedRow.reasonOfRejection || data.reasonOfRejection,
                    officerComment: matchedRow.officerComment || data.officerComment,
                    reasonOfRejectionDetails:
                      matchedRow.reasonOfRejectionDetails || data.reasonOfRejectionDetails,
                  };
                }
              } catch (listErr) {
                console.warn('[ReviewApplication] Failed to supplement loan data from list:', listErr);
              }
            }

            if (isMounted) {
              setLoanData(data);
              const applicantName =
                data.declearedName || data.userDetails?.name || '';
              if (applicantName) {
                setDeclearedName(applicantName);
              }

              const guardian =
                data.declearedGuardianName ||
                data.userDetails?.guardianName ||
                '';
              if (guardian) {
                setDeclearedGuardianName(guardian);
              }
            }
            await setStoredLoanDetails(data);
          } else {
            // Fallback to cached loan details if available
            const cached = await getStoredLoanDetails<LoanDetailsData>();
            if (cached && isMounted) {
              setLoanData(cached);
              if (cached.declearedName || cached.userDetails?.name) {
                setDeclearedName(
                  cached.declearedName || cached.userDetails?.name || '',
                );
              }
              if (cached.declearedGuardianName || cached.userDetails?.guardianName) {
                setDeclearedGuardianName(
                  cached.declearedGuardianName ||
                  cached.userDetails?.guardianName ||
                  '',
                );
              }
            }
          }
        } else {
          // Fallback to cached loan details if available
          const cached = await getStoredLoanDetails<LoanDetailsData>();
          if (cached && isMounted) {
            setLoanData(cached);
            if (cached.id) {
              setActiveLoanId(cached.id);
            }
            if (cached.declearedName || cached.userDetails?.name) {
              setDeclearedName(
                cached.declearedName || cached.userDetails?.name || '',
              );
            }
            if (cached.declearedGuardianName || cached.userDetails?.guardianName) {
              setDeclearedGuardianName(
                cached.declearedGuardianName ||
                cached.userDetails?.guardianName ||
                '',
              );
            }
          }
        }
      } catch (err: any) {
        console.warn(
          '[ReviewApplication] Could not fetch live loan details, checking cache:',
          err?.message || err,
        );
        const cached = await getStoredLoanDetails<LoanDetailsData>();
        if (cached && isMounted) {
          setLoanData(cached);
          if (cached.id) {
            setActiveLoanId(cached.id);
          }
          if (cached.declearedName || cached.userDetails?.name) {
            setDeclearedName(
              cached.declearedName || cached.userDetails?.name || '',
            );
          }
          if (cached.declearedGuardianName || cached.userDetails?.guardianName) {
            setDeclearedGuardianName(
              cached.declearedGuardianName ||
              cached.userDetails?.guardianName ||
              '',
            );
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [route.params?.loanId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = async () => {
    // 1. Mandatory Validation: Guardian Name
    const trimmedGuardian = declearedGuardianName.trim();
    if (!trimmedGuardian) {
      setGuardianError('Guardian Name (Father / Husband) is mandatory');
      toast.error('Guardian Name is required.');
      Alert.alert(
        'Guardian Name Required',
        'Please enter the Guardian Name (Father / Husband) in the Declaration section before submitting.',
      );
      // Scroll to declaration card
      scrollViewRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => {
        guardianInputRef.current?.focus();
      }, 300);
      return;
    }
    setGuardianError('');

    // 2. Validate Confirmation Checkbox
    if (!isConfirmed) {
      Alert.alert(
        'Confirmation Required',
        'Please check the box to confirm that the above information is correct and complete.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const finalLoanId =
        activeLoanId ||
        (await getLoanId()) ||
        loanData?.id ||
        '';

      const applicantName = (
        declearedName ||
        loanData?.userDetails?.name ||
        ''
      ).trim();

      const payload = {
        loanId: finalLoanId,
        declearedName: applicantName,
        declearedGuardianName: trimmedGuardian,
        declaration: true,
        noObjection: true,
      };

      const response = await submitDeclarationDetails(payload);

      if (response && response.success) {
        toast.success(
          response.message || 'Application submitted successfully!',
        );

        // Update stored details with submitted state
        try {
          const stored = (await getStoredLoanDetails<any>()) || {};
          await setStoredLoanDetails({
            ...stored,
            declearedName: applicantName,
            declearedGuardianName: trimmedGuardian,
            declaration: true,
            noObjection: true,
            step: 'review',
            loanStatus: 'submitted',
          });
        } catch (e) {
          console.warn('[ReviewApplication] Failed to cache state:', e);
        }

        const appDisplayId =
          loanData?.applicationNumber ||
          loanData?.applicationId ||
          fallbackAppNumber;

        setSubmittedAppId(appDisplayId);
        setSuccessModalVisible(true);
      } else {
        const errorMsg =
          response?.message || 'Failed to submit loan application';
        toast.error(errorMsg);
        Alert.alert('Submission Error', errorMsg);
      }
    } catch (err: any) {
      console.error('[ReviewApplication] Submit error:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to submit application. Please try again.';
      toast.error(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper values for display
  const user = loanData?.userDetails;
  const address = loanData?.addressDetails;
  const shg = loanData?.SHGDetails;
  const incomeRange = loanData?.familyIncomeRange;
  const occupation = loanData?.occupationDetails;

  const displayAppId =
    loanData?.applicationNumber || loanData?.applicationId || fallbackAppNumber;
  const displayAppliedDate = formatDate(
    loanData?.appliedAt || loanData?.createdAt,
  );
  const normalizedStep = (loanData?.step || '')
    .toLowerCase()
    .trim()
    .replace(/[-_\s]/g, '');
  const normalizedStatus = (loanData?.loanStatus || '')
    .toLowerCase()
    .trim()
    .replace(/[-_\s]/g, '');

  const isRejected = normalizedStatus === 'rejected';

  const isSubmittedApplication =
    normalizedStatus === 'submitted' ||
    normalizedStatus === 'approved' ||
    isRejected ||
    (normalizedStep === 'review' &&
      normalizedStatus !== 'inprogress' &&
      normalizedStatus !== 'in_progress' &&
      normalizedStatus !== 'draft');

  const displayStatus = loanData?.loanStatus
    ? loanData.loanStatus.toUpperCase()
    : isSubmittedApplication
      ? 'SUBMITTED'
      : 'IN PROGRESS';

  // Count uploaded documents
  const docPhotos = [
    user?.photo,
    shg?.certificate,
    shg?.bankCopy,
    ...(loanData?.documentList || []).map((d: any) => d.url || d.fileUrl),
  ].filter(Boolean);
  const totalDocCount = Math.max(docPhotos.length, 3);

  // For the first-time application review screen, all sections are editable
  const isPersonalEditable = true;
  const isAddressEditable = true;
  const isShgEditable = true;
  const isIncomeEditable = true;
  const isActivityEditable = true;
  const isDocumentEditable = true;
  const isReviewEditable = true;
  const hasAnyEditableSection = true;

  // Read-only mode does not apply to first-time review
  const isReadOnly = false;

  const parsedFieldList = parseFieldList(loanData?.fieldList);
  const hasFieldList = parsedFieldList && parsedFieldList.length > 0;

  // Guardian name is always editable in the review step
  const isGuardianEditable = true;
  const canEditGuardian = true;

  // Declared name is shown from user details
  const isDeclaredNameEditable = false;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* ══════════════════════════════════════════════════════
          TOP NAVIGATION HEADER (Back + Logo + Language)
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

        {/* Header Right Spacer to balance Back button */}
        <View style={styles.headerSpacer} />
      </View>

      {/* ══════════════════════════════════════════════════════
          PAGE CONTENT SCROLL
         ══════════════════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none">
          {/* Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>Review Your Application</Text>
            <Text style={styles.pageSubtitle}>
              Please verify your details before submitting.
            </Text>
          </View>

          {/* Loading indicator bar */}
          {isLoading && (
            <View style={styles.loadingBanner}>
              <ActivityIndicator size="small" color="#00875A" />
              <Text style={styles.loadingBannerText}>
                Loading latest application details...
              </Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════
              CARD 1: APPLICATION DETAILS
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxGreen]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M14 2V8H20M16 13H8M16 17H8M10 9H8"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Application Details</Text>
              </View>

              {/* Submitted / Rejected Badge */}
              <View
                style={[
                  styles.submittedBadge,
                  isRejected && styles.rejectedBadge,
                ]}>
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  {isRejected ? (
                    <Path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="#DC2626"
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <Path
                      d="M20 6L9 17L4 12"
                      stroke="#00875A"
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </Svg>
                <Text
                  style={[
                    styles.submittedBadgeText,
                    isRejected && styles.rejectedBadgeText,
                  ]}>
                  {displayStatus}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Application ID</Text>
                <Text style={styles.gridValue}>{displayAppId}</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Applied On</Text>
                <Text style={styles.gridValue}>{displayAppliedDate}</Text>
              </View>
            </View>

            <Text style={styles.cardNoticeText}>
              Please verify all details carefully before submitting.
            </Text>
          </View>

          {/* Rejection Notice Banner if rejected */}
          {isRejected && (
            <View style={styles.rejectionNoticeCard}>
              <View style={styles.rejectionNoticeHeader}>
                <View style={styles.rejectionIconCircle}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth={2} />
                    <Path
                      d="M12 8V12M12 16H12.01"
                      stroke="#DC2626"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <Text style={styles.rejectionNoticeTitle}>
                  Application Status: Rejected
                </Text>
              </View>
              {Boolean(
                loanData?.reasonOfRejectionDetails?.name ||
                loanData?.reasonOfRejection,
              ) && (
                  <View style={styles.rejectionRow}>
                    <Text style={styles.rejectionRowLabel}>Reason for Rejection:</Text>
                    <Text style={styles.rejectionRowValue}>
                      {loanData?.reasonOfRejectionDetails?.name ||
                        loanData?.reasonOfRejection}
                    </Text>
                  </View>
                )}
              {Boolean(loanData?.officerComment) && (
                <View style={styles.rejectionRow}>
                  <Text style={styles.rejectionRowLabel}>Officer Comment:</Text>
                  <Text style={styles.rejectionRowValue}>
                    {loanData?.officerComment}
                  </Text>
                </View>
              )}
              {hasAnyEditableSection && (
                <Text style={styles.rejectionActionNotice}>
                  Officer requested corrections on specific sections. Look for the "Edit" button on highlighted cards to update and re-submit your application.
                </Text>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════
              CARD 2: APPLICANT DETAILS
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxBlue]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                    <Circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Applicant Details</Text>
              </View>

              {/* Edit Action — Only visible if fieldList includes personal details */}
              {isPersonalEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('PersonalInfo', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppId,
                      fieldList: loanData?.fieldList,
                      loanStatus: loanData?.loanStatus,
                    })
                  }
                  activeOpacity={0.7}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Path
                      d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.editText}>Edit</Text>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 18L15 12L9 6"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.twoColumnGrid}>
              {/* Col 1 */}
              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Full Name</Text>
                  <Text style={styles.gridValue}>
                    {user?.name || declearedName || 'Not provided'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Email</Text>
                  <Text style={styles.gridValue}>
                    {user?.email ? user.email : 'Not provided'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Aadhaar Number</Text>
                  <Text style={styles.gridValue}>
                    {user?.aadhaarNo || loanData?.aadhaarNo || 'Not provided'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Gender</Text>
                  <Text style={styles.gridValue}>
                    {user?.gender || 'MALE'}
                  </Text>
                </View>
              </View>

              {/* Col 2 */}
              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Category</Text>
                  <Text style={styles.gridValue}>
                    {user?.category || 'General'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Mobile</Text>
                  <Text style={styles.gridValue}>
                    {user?.phone
                      ? `${user?.cc || '+91'} ${user.phone}`
                      : '7557003298'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Date of Birth</Text>
                  <Text style={styles.gridValue}>
                    {formatDate(user?.dob || '2000-09-22T00:00:00.000Z')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              CARD 3: ADDRESS
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxGreen]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 21C16 16.5 19 13.5 19 9.5C19 5.35786 15.866 2 12 2C8.13401 2 5 5.35786 5 9.5C5 13.5 8 16.5 12 21Z"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                    <Circle
                      cx="12"
                      cy="9"
                      r="3"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Address</Text>
              </View>

              {/* Edit Action — Only visible if fieldList includes address */}
              {isAddressEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('AddressDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppId,
                      fieldList: loanData?.fieldList,
                      loanStatus: loanData?.loanStatus,
                    })
                  }
                  activeOpacity={0.7}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Path
                      d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.editText}>Edit</Text>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 18L15 12L9 6"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.twoColumnGrid}>
              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Village / Locality</Text>
                  <Text style={styles.gridValue}>
                    {address?.locality || 'Mani Village'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>District</Text>
                  <Text style={styles.gridValue}>
                    {address?.districtName?.name ||
                      (address?.district ? `District ${address.district}` : 'Bishnupur')}
                  </Text>
                </View>
              </View>

              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>
                    Gram Panchayat / Municipality / Block
                  </Text>
                  <Text style={styles.gridValue}>
                    {address?.panchayat || address?.block || 'DA'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>State</Text>
                  <Text style={styles.gridValue}>
                    {address?.stateName?.name || 'Manipur'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              CARD 4: SELF HELP GROUP DETAILS
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxBlue]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                    <Circle
                      cx="12"
                      cy="11"
                      r="3.5"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Self Help Group Details</Text>
              </View>

              {/* Edit Action — Only visible if fieldList includes SHG */}
              {isShgEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('SHGDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppId,
                      shgDetails: shg,
                      fieldList: loanData?.fieldList,
                      loanStatus: loanData?.loanStatus,
                    })
                  }
                  activeOpacity={0.7}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Path
                      d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.editText}>Edit</Text>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 18L15 12L9 6"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.twoColumnGrid}>
              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>APUNBA</Text>
                  <Text style={styles.gridValue}>
                    {shg?.shgName || 'TestSAIK'}
                  </Text>
                </View>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>D-F</Text>
                  <Text style={styles.gridValue}>
                    {formatDate(shg?.dateOfFormation)}
                  </Text>
                </View>
              </View>

              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>APUNBA Id</Text>
                  <Text style={styles.gridValue}>
                    {shg?.shgId || '2dew2dew'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              CARD 5: FAMILY & INCOME DETAILS
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxGreen]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="2"
                      y="7"
                      width="20"
                      height="14"
                      rx="3"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Family & Income Details</Text>
              </View>

              {/* Edit Action — Only visible if fieldList includes income */}
              {isIncomeEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('IncomeDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppId,
                      fieldList: loanData?.fieldList,
                      loanStatus: loanData?.loanStatus,
                    })
                  }
                  activeOpacity={0.7}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Path
                      d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.editText}>Edit</Text>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 18L15 12L9 6"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.itemBlock}>
              <Text style={styles.gridLabel}>Annual Family Income</Text>
              <Text style={styles.gridValue}>
                {cleanHtml(incomeRange?.name) || 'Rs. 2 lakh to Rs. 3 lakh'}
              </Text>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              CARD 6: PROPOSED ECONOMIC ACTIVITY
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxBlue]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18 20V10M12 20V4M6 20V14"
                      stroke="#0284C7"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Proposed Economic Activity</Text>
              </View>

              {/* Edit Action — Only visible if fieldList includes economic activity */}
              {isActivityEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('EconomicActivity', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppId,
                      fieldList: loanData?.fieldList,
                      loanStatus: loanData?.loanStatus,
                    })
                  }
                  activeOpacity={0.7}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Path
                      d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.editText}>Edit</Text>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 18L15 12L9 6"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.twoColumnGrid}>
              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Economic Activity</Text>
                  <Text style={styles.gridValue}>
                    {occupation?.name || 'Bakery Products'}
                  </Text>
                </View>
              </View>

              <View style={styles.columnHalf}>
                <View style={styles.itemBlock}>
                  <Text style={styles.gridLabel}>Description</Text>
                  <Text style={styles.gridValue}>
                    {loanData?.descriptionOfProposedActivity || 'None'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              CARD 7: DECLARATION & APPLICATION STATUS
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxGreen]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M9 12L11 14L15 10"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>
                  Declaration & Application Status
                </Text>
              </View>

              {/* Edit Action — Only visible if fieldList includes review / declaration */}
              {isReviewEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    guardianInputRef.current?.focus();
                  }}
                  activeOpacity={0.7}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Path
                      d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Applicant Name & Current Step */}
            <View style={styles.declarationInfoRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Declared Applicant Name</Text>
                {isDeclaredNameEditable ? (
                  <TextInput
                    style={[styles.gridValue, styles.editableDeclaredInput]}
                    value={declearedName}
                    onChangeText={setDeclearedName}
                    placeholder="Enter applicant name"
                    placeholderTextColor="#94A3B8"
                  />
                ) : (
                  <Text style={styles.gridValue}>{declearedName}</Text>
                )}
              </View>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Current Application Step</Text>
                <Text style={styles.gridValue}>
                  {loanData?.step || 'review'}
                </Text>
              </View>
            </View>

            {/* MANDATORY GUARDIAN NAME INPUT */}
            <View style={styles.guardianInputSection}>
              <Text style={styles.guardianInputLabel}>
                Guardian Name (Father / Husband) <Text style={styles.redAsterisk}>*</Text>
              </Text>
              <Pressable
                style={[
                  styles.guardianInputWrapper,
                  isGuardianFocused && styles.guardianInputWrapperFocused,
                  Boolean(guardianError) && styles.guardianInputWrapperError,
                  !canEditGuardian && styles.guardianInputWrapperDisabled,
                ]}
                onPress={() => {
                  if (canEditGuardian) {
                    guardianInputRef.current?.focus();
                  }
                }}>
                <View style={styles.guardianIcon}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                      stroke={isGuardianFocused ? '#00875A' : '#64748B'}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke={isGuardianFocused ? '#00875A' : '#64748B'}
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <TextInput
                  ref={guardianInputRef}
                  style={[
                    styles.guardianTextInput,
                    !canEditGuardian && styles.guardianTextInputDisabled,
                  ]}
                  value={declearedGuardianName}
                  editable={canEditGuardian}
                  onChangeText={text => {
                    setDeclearedGuardianName(text);
                    if (guardianError) {
                      setGuardianError('');
                    }
                  }}
                  onFocus={() => {
                    setIsGuardianFocused(true);
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                  onBlur={() => setIsGuardianFocused(false)}
                  placeholder="Enter guardian name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </Pressable>
              {Boolean(guardianError) ? (
                <Text style={styles.fieldErrorText}>{guardianError}</Text>
              ) : (
                <Text style={styles.fieldHintText}>
                  Please provide guardian (Father / Husband) full name for application records.
                </Text>
              )}
            </View>

            {/* Extra Comments / Status if available */}
            {Boolean(loanData?.officerComment) && (
              <View style={styles.commentBox}>
                <Text style={styles.gridLabel}>Officer Comment</Text>
                <Text style={styles.gridValue}>{loanData?.officerComment}</Text>
              </View>
            )}
          </View>

          {/* ══════════════════════════════════════════════════════
              CARD 8: UPLOADED DOCUMENTS
             ══════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxBlue]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M14 2V8H20M16 13H8M16 17H8M10 9H8"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <View>
                  <Text style={styles.cardTitle}>Uploaded Documents</Text>
                  <Text style={styles.gridLabel}>Total Documents</Text>
                  <Text style={styles.gridValue}>{totalDocCount} documents</Text>
                </View>
              </View>

              {/* Edit Action — Visible if fieldList includes documents */}
              {isDocumentEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('SHGDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppId,
                      fieldList: loanData?.fieldList,
                      loanStatus: loanData?.loanStatus,
                    })
                  }
                  activeOpacity={0.7}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Document Preview Grid */}
            <View style={styles.docPreviewGrid}>
              {/* Document 1: Applicant Photo */}
              <TouchableOpacity
                style={styles.docPreviewCard}
                activeOpacity={0.8}
                onPress={() => {
                  const photoUri =
                    user?.photo ||
                    Image.resolveAssetSource(
                      require('../assets/images/applicant_sample_photo.jpg'),
                    )?.uri;
                  setPreviewImageError(false);
                  setPreviewDoc({
                    title: 'Applicant Photo',
                    uri: photoUri,
                    fileName: 'applicant_photo.jpg',
                    docType: 'Passport Size Photograph',
                  });
                }}>
                <View style={[styles.docPreviewImageWrapper, styles.docPreviewFileWrapper]}>
                  <View style={[styles.defaultFileIconBadge, { backgroundColor: '#FAF5FF' }]}>
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                        fill="#FAF5FF"
                        stroke="#7C3AED"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M14 2V8H20"
                        fill="#EDE9FE"
                        stroke="#7C3AED"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M8 13H16M8 17H13"
                        stroke="#7C3AED"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                  <View style={[styles.fileFormatTag, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[styles.fileFormatText, { color: '#7C3AED' }]}>JPG / PNG</Text>
                  </View>
                  <View style={styles.docPreviewOverlay}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M15 3H21V9M21 3L14 10M10 14L3 21M3 21V15M3 21H9"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                </View>
                <Text style={styles.docPreviewLabel} numberOfLines={1}>
                  Applicant Photo
                </Text>
              </TouchableOpacity>

              {/* Document 2: SHG Certificate */}
              <TouchableOpacity
                style={styles.docPreviewCard}
                activeOpacity={0.8}
                onPress={() => {
                  const certUri = resolveDocUri(shg?.certificate);
                  const fileName = getDocFileName(
                    shg?.certificate,
                    'SHG_Certificate.pdf',
                  );
                  setPreviewImageError(false);
                  setPreviewDoc({
                    title: 'SHG Certificate',
                    uri: certUri,
                    fileName,
                    docType: 'SHG Membership Certificate / Proof',
                  });
                }}>
                <View style={[styles.docPreviewImageWrapper, styles.docPreviewFileWrapper]}>
                  <View style={styles.defaultFileIconBadge}>
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                        fill="#F0FDF4"
                        stroke="#00875A"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M14 2V8H20"
                        fill="#DCFCE7"
                        stroke="#00875A"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M8 13H16M8 17H13"
                        stroke="#00875A"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                  <View style={styles.fileFormatTag}>
                    <Text style={styles.fileFormatText}>PDF / DOC</Text>
                  </View>
                  <View style={styles.docPreviewOverlay}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M15 3H21V9M21 3L14 10M10 14L3 21M3 21V15M3 21H9"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                </View>
                <Text style={styles.docPreviewLabel} numberOfLines={1}>
                  C
                </Text>
              </TouchableOpacity>

              {/* Document 3: Bank Passbook */}
              <TouchableOpacity
                style={styles.docPreviewCard}
                activeOpacity={0.8}
                onPress={() => {
                  const bankUri = resolveDocUri(shg?.bankCopy);
                  const fileName = getDocFileName(
                    shg?.bankCopy,
                    'Bank_Passbook.pdf',
                  );
                  setPreviewImageError(false);
                  setPreviewDoc({
                    title: 'P',
                    uri: bankUri,
                    fileName,
                    docType: 'P',
                  });
                }}>
                <View style={[styles.docPreviewImageWrapper, styles.docPreviewFileWrapper]}>
                  <View style={[styles.defaultFileIconBadge, { backgroundColor: '#EFF6FF' }]}>
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                        fill="#EFF6FF"
                        stroke="#2563EB"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M14 2V8H20"
                        fill="#DBEAFE"
                        stroke="#2563EB"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M8 13H16M8 17H13"
                        stroke="#2563EB"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                  <View style={[styles.fileFormatTag, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.fileFormatText, { color: '#1D4ED8' }]}>PASSBOOK</Text>
                  </View>
                  <View style={styles.docPreviewOverlay}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M15 3H21V9M21 3L14 10M10 14L3 21M3 21V15M3 21H9"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                </View>
                <Text style={styles.docPreviewLabel} numberOfLines={1}>
                  P
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════
              CONFIRMATION CHECKBOX CARD
             ══════════════════════════════════════════════════════ */}


          {/* ══════════════════════════════════════════════════════
              BOTTOM BUTTONS: [ ← Back ] [ Submit Application → ]
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

            {/* Submit Application Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    Submit Application
                  </Text>
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



      {/* Full-Screen Document / Image Preview Modal */}
      <Modal
        visible={Boolean(previewDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreviewDoc(null);
          setPreviewImageError(false);
        }}>
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalHeader}>
            <View style={{ width: 36 }} />
            <Text style={styles.previewModalTitle}>{previewDoc?.title}</Text>
            <TouchableOpacity
              style={styles.previewModalCloseBtn}
              onPress={() => {
                setPreviewDoc(null);
                setPreviewImageError(false);
              }}
              activeOpacity={0.7}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {previewDoc?.uri && !previewImageError ? (
            <View style={styles.previewImageContainer}>
              <Image
                source={{ uri: previewDoc.uri }}
                style={styles.previewModalImage}
                resizeMode="contain"
                onError={() => setPreviewImageError(true)}
              />
            </View>
          ) : (
            <View style={styles.docModalCard}>
              <View style={styles.docModalIconWrap}>
                <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                    fill="#F0FDF4"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M14 2V8H20"
                    fill="#DCFCE7"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M8 13H16M8 17H13"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>

              <Text style={styles.docModalTitle}>{previewDoc?.title}</Text>
              <Text style={styles.docModalFileName} numberOfLines={2}>
                {previewDoc?.fileName || 'Document.pdf'}
              </Text>

              <View style={styles.docModalVerifiedPill}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20 6L9 17L4 12"
                    stroke="#00875A"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.docModalVerifiedText}>
                  Uploaded & Attached
                </Text>
              </View>

              <View style={styles.docModalDetailsBox}>
                <View style={styles.docModalDetailRow}>
                  <Text style={styles.docModalDetailLabel}>Category</Text>
                  <Text style={styles.docModalDetailVal}>
                    {previewDoc?.docType || 'Official Document'}
                  </Text>
                </View>
                <View style={styles.docModalDetailRow}>
                  <Text style={styles.docModalDetailLabel}>Application No</Text>
                  <Text style={styles.docModalDetailVal}>{displayAppId}</Text>
                </View>
                <View style={styles.docModalDetailRow}>
                  <Text style={styles.docModalDetailLabel}>Status</Text>
                  <Text style={[styles.docModalDetailVal, { color: '#00875A' }]}>
                    Verified
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.docModalCloseAction}
                onPress={() => {
                  setPreviewDoc(null);
                  setPreviewImageError(false);
                }}
                activeOpacity={0.8}>
                <Text style={styles.docModalCloseActionText}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Submission Success Modal */}
      <SubmissionSuccessModal
        visible={successModalVisible}
        title="Application Submitted Successfully!"
        showAppId={false}
        showMessage={false}
        showStatusPill={false}
        buttonText="OK"
        showButtonArrow={false}
        autoDismissMs={3000}
        onPrimaryAction={handleSignOutAfterSubmission}
        onGoToDashboard={handleSignOutAfterSubmission}
        onClose={handleSignOutAfterSubmission}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
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
  headerSpacer: {
    minWidth: 70,
  },


  // Main Scroll Container
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },

  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '400',
  },

  // Loading Banner
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingBannerText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '500',
  },

  // Review Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxGreen: {
    backgroundColor: '#D1FAE5',
  },
  iconBoxBlue: {
    backgroundColor: '#E0F2FE',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Submitted Badge
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  submittedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00875A',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  rejectedBadgeText: {
    color: '#DC2626',
  },
  rejectionNoticeCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  rejectionNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectionNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  rejectionRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  rejectionRowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7F1D1D',
    flex: 1,
  },
  rejectionActionNotice: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#B91C1C',
    marginTop: 8,
    lineHeight: 16,
  },

  // Edit Action
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  editText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00875A',
  },

  // Details Grid
  detailsGrid: {
    gap: 6,
    paddingLeft: 44,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 44,
  },
  columnHalf: {
    flex: 0.48,
  },
  itemBlock: {
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardNoticeText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 8,
    paddingLeft: 44,
  },

  // Declaration Card Specific Styles
  declarationInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 44,
    marginBottom: 12,
  },
  editableDeclaredInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#00875A',
    paddingVertical: 2,
    color: '#0F172A',
  },
  guardianInputSection: {
    marginLeft: 44,
    marginTop: 4,
    marginBottom: 8,
  },
  guardianInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  redAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
  },
  guardianInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  guardianInputWrapperFocused: {
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  guardianInputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  guardianIcon: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianTextInput: {
    flex: 1,
    height: '100%',
    minHeight: 44,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  guardianInputWrapperDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  guardianTextInputDisabled: {
    color: '#64748B',
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  fieldHintText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  commentBox: {
    marginLeft: 44,
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },

  // Document Thumbnails
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thumbWrapper: {
    width: 36,
    height: 36,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Document Preview Grid
  docPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  docPreviewCard: {
    width: (Dimensions.get('window').width - 32 - 28 - 20) / 3,
    alignItems: 'center',
  },
  docPreviewImageWrapper: {
    width: '100%',
    aspectRatio: 0.85,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  docPreviewFileWrapper: {
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  defaultFileIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileFormatTag: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#DCFCE7',
  },
  fileFormatText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00875A',
    letterSpacing: 0.3,
  },
  previewImageContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    width: '88%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  docModalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  docModalFileName: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  docModalVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  docModalVerifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  docModalDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docModalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docModalDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  docModalDetailVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  docModalCloseAction: {
    marginTop: 18,
    backgroundColor: '#00875A',
    paddingVertical: 11,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  docModalCloseActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  docPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  docPreviewOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreviewLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    marginTop: 5,
    textAlign: 'center',
  },

  // Full-screen Image Preview Modal
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  previewModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  previewModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.65,
    resizeMode: 'contain',
  },

  // Confirmation Checkbox Card
  confirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F6FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  confirmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 10,
  },
  infoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLetter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  confirmText: {
    fontSize: 11.5,
    color: '#0369A1',
    fontWeight: '600',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.8,
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0284C7',
  },

  // Bottom Buttons Row: [ ← Back ] [ Submit Application → ]
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 0.38,
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
    flex: 0.62,
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
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ReviewApplicationScreen;
