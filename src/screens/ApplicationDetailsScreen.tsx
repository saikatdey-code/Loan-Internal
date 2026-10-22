/**
 * ApplicationDetailsScreen — Dedicated screen for viewing application details from HomeScreen.
 * Features:
 * - Title: "Application Details"
 * - Subtitle: "Details of your loan application."
 * - Strict fieldList editability rules:
 *   - If fieldList is null, undefined, or empty:
 *     - No Edit buttons on any card.
 *     - No Submit Application button.
 *     - No confirmation checkbox.
 *     - Back button expands to full width.
 *     - Guardian name is read-only.
 *   - If fieldList contains keys:
 *     - Only matching sections show the "Edit" button.
 *     - Guardian name is editable only if review is in fieldList.
 *     - Submit Updates button and confirmation checkbox are visible.
 */
import React, {useState, useCallback, useEffect, useRef} from 'react';
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
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

import {Logo, useToast, WatermarkBackground, SubmissionSuccessModal} from '../components';
import {isFieldEditable, isSectionEditable, parseFieldList} from '../utils/fieldPermissions';
import type {RootStackParamList, RootStackScreenProps} from '../types/navigation';
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
} from '../services/storage';

type Props = RootStackScreenProps<'ApplicationDetails'>;

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

const ApplicationDetailsScreen: React.FC<Props> = ({navigation, route}) => {
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

  // Final declaration form states
  const [declearedName, setDeclearedName] = useState('');
  const [declearedGuardianName, setDeclearedGuardianName] = useState('');
  const [guardianError, setGuardianError] = useState('');
  const [isGuardianFocused, setIsGuardianFocused] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Document modal preview state
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    uri?: string | null;
    fileName?: string;
    docType?: string;
  } | null>(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const resolveDocUri = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string' && val.trim().length > 0) return val;
    if (typeof val === 'object') {
      return val.uri || val.fileUri || val.url || null;
    }
    return null;
  };

  const getDocFileName = (val: any, defaultName: string): string => {
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

        if (isInvalidId(resolvedLoanId)) {
          try {
            const listRes = await getLoanList();
            if (listRes && listRes.success && listRes.data?.rows?.length > 0) {
              resolvedLoanId = listRes.data.rows[0].id;
              await setLoanId(resolvedLoanId);
            }
          } catch (listErr) {
            console.warn('[ApplicationDetails] Failed to fetch loan list:', listErr);
          }
        }

        if (resolvedLoanId && !isInvalidId(resolvedLoanId)) {
          setActiveLoanId(resolvedLoanId);
          await setLoanId(resolvedLoanId);

          const res = await getLoanDetailsAuth(resolvedLoanId);
          if (res && res.success && res.data) {
            let data = res.data;

            if (!data.fieldList || (Array.isArray(data.fieldList) && data.fieldList.length === 0)) {
              if (route.params?.fieldList) {
                data = {
                  ...data,
                  fieldList: route.params.fieldList,
                };
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
          '[ApplicationDetails] Could not fetch live loan details, checking cache:',
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
    const trimmedGuardian = declearedGuardianName.trim();
    if (!trimmedGuardian) {
      setGuardianError('Guardian Name (Father / Husband) is mandatory');
      toast.error('Guardian Name is required.');
      Alert.alert(
        'Guardian Name Required',
        'Please enter the Guardian Name (Father / Husband) in the Declaration section before submitting.',
      );
      scrollViewRef.current?.scrollToEnd({animated: true});
      setTimeout(() => {
        guardianInputRef.current?.focus();
      }, 300);
      return;
    }
    setGuardianError('');

    if (!isConfirmed) {
      toast.error('Please confirm the declaration checkbox before submitting.');
      Alert.alert(
        'Declaration Confirmation Required',
        'Please verify and check the confirmation box: "I confirm that the above information is correct and complete."',
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        loanId: activeLoanId,
        declearedName: declearedName.trim(),
        declearedGuardianName: trimmedGuardian,
        declaration: true,
        noObjection: true,
      };

      const response = await submitDeclarationDetails(payload);

      if (response && response.success) {
        toast.success(
          response.message || 'Application submitted successfully!',
        );

        if (loanData) {
          await setStoredLoanDetails({
            ...loanData,
            declearedName: declearedName.trim(),
            declearedGuardianName: trimmedGuardian,
            declaration: true,
            loanStatus: 'submitted',
          });
        }

        setSuccessModalVisible(true);
      } else {
        const errorMsg =
          response?.message || 'Failed to submit application. Please try again.';
        toast.error(errorMsg);
        Alert.alert('Submission Error', errorMsg);
      }
    } catch (err: any) {
      console.error('[ApplicationDetails] Final submission error:', err);
      const isNetworkErr =
        err?.message?.includes('Network') ||
        err?.message?.includes('Failed to fetch');
      const errorMsg = isNetworkErr
        ? 'Network error. Please check your internet connection.'
        : err?.response?.data?.message ||
          err?.message ||
          'Failed to submit declaration.';
      toast.error(errorMsg);
      Alert.alert('Submission Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const user = loanData?.userDetails;
  const address = loanData?.addressDetails;
  const shg = loanData?.SHGDetails;
  const occupation = loanData?.occupationDetails;
  const incomeRange = loanData?.familyIncomeRange;

  const displayAppId =
    loanData?.applicationId ||
    loanData?.applicationNumber ||
    fallbackAppNumber ||
    'WEMN' + (loanData?.id?.slice(0, 8).toUpperCase() || '20260000001');

  const displayAppNumber =
    loanData?.applicationNumber ||
    fallbackAppNumber ||
    loanData?.applicationId ||
    displayAppId;

  const appliedDateStr = formatDate(
    loanData?.appliedAt || loanData?.createdAt,
  );

  const normalizedStatus = (loanData?.loanStatus || route.params?.loanStatus || '')
    .toLowerCase()
    .trim()
    .replace(/[-_\s]/g, '');

  const isRejected = normalizedStatus === 'rejected';

  const displayStatus = loanData?.loanStatus
    ? loanData.loanStatus.toUpperCase()
    : 'IN PROGRESS';

  const rejectionReason =
    loanData?.reasonOfRejectionDetails?.name ||
    (typeof loanData?.reasonOfRejection === 'string'
      ? loanData.reasonOfRejection
      : '') ||
    'Identity and Data Mismatches';

  const officerComment = loanData?.officerComment;

  const updatedByText =
    loanData?.loanStatusUpdateByDetails?.name ||
    loanData?.loanStatusUpdateByDetails?.userName ||
    loanData?.updatedByUser?.name ||
    loanData?.updatedBy?.name ||
    (typeof loanData?.updatedBy === 'string' && loanData.updatedBy.trim()
      ? loanData.updatedBy
      : '') ||
    loanData?.officerName ||
    loanData?.actionBy?.name ||
    loanData?.rejectedBy ||
    'Super Admin';

  const fieldListArray: string[] = (() => {
    const fl = loanData?.fieldList || route.params?.fieldList;
    if (!fl) return [];
    if (Array.isArray(fl)) {
      const arr: string[] = [];
      fl.forEach(item => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                parsed.forEach(p => arr.push(String(p).trim()));
              } else {
                arr.push(trimmed);
              }
            } catch {
              arr.push(trimmed);
            }
          } else {
            arr.push(trimmed);
          }
        } else if (typeof item === 'object' && item !== null) {
          const name = item.field || item.name || item.key || item.fieldName;
          if (name) arr.push(String(name).trim());
        }
      });
      return arr.filter(Boolean);
    }
    if (typeof fl === 'string') {
      const trimmed = fl.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map(s => String(s).trim()).filter(Boolean);
          }
        } catch {
          return trimmed.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof fl === 'object') {
      return Object.keys(fl).filter(k => Boolean(fl[k]));
    }
    return [];
  })();

  const docPhotos = [
    resolveDocUri(user?.photo),
    resolveDocUri(shg?.certificate),
    resolveDocUri(shg?.bankCopy),
  ].filter(Boolean);
  const totalDocCount = Math.max(docPhotos.length, 3);

  // FieldList-driven section editability (Only sections matching fieldList are editable)
  const isPersonalEditable = isSectionEditable(
    'personal',
    loanData?.fieldList,
    loanData?.loanStatus,
  );
  const isAddressEditable = isSectionEditable(
    'address',
    loanData?.fieldList,
    loanData?.loanStatus,
  );
  const isShgEditable = isSectionEditable(
    'shg',
    loanData?.fieldList,
    loanData?.loanStatus,
  );
  const isIncomeEditable = isSectionEditable(
    'income',
    loanData?.fieldList,
    loanData?.loanStatus,
  );
  const isActivityEditable = isSectionEditable(
    'activity',
    loanData?.fieldList,
    loanData?.loanStatus,
  );
  const isDocumentEditable = isSectionEditable(
    'document',
    loanData?.fieldList,
    loanData?.loanStatus,
  );
  const isReviewEditable = isSectionEditable(
    'review',
    loanData?.fieldList,
    loanData?.loanStatus,
  );
  const hasAnyEditableSection =
    isPersonalEditable ||
    isAddressEditable ||
    isShgEditable ||
    isIncomeEditable ||
    isActivityEditable ||
    isDocumentEditable ||
    isReviewEditable;

  const parsedFieldList = parseFieldList(loanData?.fieldList);
  const hasFieldList = parsedFieldList && parsedFieldList.length > 0;
  const hasCorrectionFields = fieldListArray.length > 0 || hasFieldList;

  // Guardian name is editable only when fieldList includes review / declearedGuardianName
  const isGuardianEditable =
    hasFieldList &&
    isFieldEditable(
      'declearedGuardianName',
      loanData?.fieldList,
      loanData?.loanStatus,
    );
  const canEditGuardian = isGuardianEditable;

  // Declared name is editable only when fieldList includes review / declearedName
  const isDeclaredNameEditable =
    hasFieldList &&
    isFieldEditable(
      'declearedName',
      loanData?.fieldList,
      loanData?.loanStatus,
    );

  const getFirstCorrectionScreen = (): keyof RootStackParamList => {
    const fl = loanData?.fieldList || route.params?.fieldList;
    if (!fl) return 'PersonalInfo';
    let fields: string[] = [];

    if (Array.isArray(fl)) {
      fields = fl.map(f => {
        if (typeof f === 'string') return f.toLowerCase().trim();
        if (typeof f === 'object' && f !== null) {
          return (
            f.field ||
            f.name ||
            f.key ||
            f.fieldName ||
            ''
          ).toLowerCase().trim();
        }
        return String(f).toLowerCase().trim();
      });
    } else if (typeof fl === 'string') {
      const trimmed = fl.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            fields = parsed.map(f => String(f).toLowerCase().trim());
          }
        } catch {
          fields = trimmed.toLowerCase().split(',').map(s => s.trim());
        }
      } else {
        fields = trimmed.toLowerCase().split(',').map(s => s.trim());
      }
    } else if (typeof fl === 'object' && fl !== null) {
      fields = Object.keys(fl)
        .filter(k => Boolean(fl[k]))
        .map(k => k.toLowerCase().trim());
    }

    if (fields.length === 0) return 'PersonalInfo';

    if (
      fields.some(f =>
        [
          'personal',
          'personaldetails',
          'name',
          'applicant',
          'dob',
          'gender',
          'aadhaar',
          'category',
          'guardian',
        ].some(keyword => f === keyword || f.includes(keyword) || keyword.includes(f)),
      )
    ) {
      return 'PersonalInfo';
    }

    if (
      fields.some(f =>
        [
          'address',
          'locality',
          'panchayat',
          'district',
          'block',
          'city',
          'state',
          'pin',
          'house',
          'street',
        ].some(keyword => f === keyword || f.includes(keyword) || keyword.includes(f)),
      )
    ) {
      return 'AddressDetails';
    }

    if (
      fields.some(f =>
        [
          'loanshg',
          'shg',
          'certificate',
          'bankcopy',
        ].some(keyword => f === keyword || f.includes(keyword) || keyword.includes(f)),
      )
    ) {
      return 'SHGDetails';
    }

    if (
      fields.some(f =>
        [
          'income',
          'familyincome',
          'annualincome',
        ].some(keyword => f === keyword || f.includes(keyword) || keyword.includes(f)),
      )
    ) {
      return 'IncomeDetails';
    }

    if (
      fields.some(f =>
        [
          'economyactivity',
          'activity',
          'proposedactivity',
        ].some(keyword => f === keyword || f.includes(keyword) || keyword.includes(f)),
      )
    ) {
      return 'EconomicActivity';
    }

    return 'PersonalInfo';
  };

  const handleEditAndResubmit = () => {
    const targetLoanId = activeLoanId || loanData?.id;
    const applicationNumber = displayAppNumber;
    const fieldList = loanData?.fieldList || route.params?.fieldList;
    const loanStatus = loanData?.loanStatus || route.params?.loanStatus;

    const firstScreen = getFirstCorrectionScreen();
    navigation.navigate(firstScreen as any, {
      loanId: targetLoanId,
      applicationNumber,
      fieldList,
      loanStatus,
      isEdit: true,
      loanDetails: loanData,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* Top Navigation Header */}
      <View style={styles.topHeader}>
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

        <View style={styles.centerLogo}>
          <Logo size="small" showSubtitle={true} />
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Page Content */}
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
            <Text style={styles.pageTitle}>Application Details</Text>
            <Text style={styles.pageSubtitle}>
              {isRejected
                ? 'Your application has been rejected. Review the details and make the required changes.'
                : !hasFieldList
                ? 'Details of your loan application.'
                : 'Please verify your details before submitting.'}
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

          {/* CARD 1: APPLICATION DETAILS */}
          <View style={styles.card}>
            <View style={styles.appDetailsHeaderRow}>
              <View style={styles.appDetailsHeaderLeft}>
                <Text style={styles.appDetailsOverline}>APPLICATION DETAILS</Text>
                <Text style={styles.appDetailsNumber} numberOfLines={1}>
                  {displayAppNumber}
                </Text>
                <View style={styles.appDetailsDateRow}>
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
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
                  <Text style={styles.appDetailsDateText}>
                    Submitted {appliedDateStr}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  isRejected ? styles.statusBadgeRejected : styles.statusBadgeGreen,
                ]}>
                {isRejected ? (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth={2} />
                    <Path
                      d="M12 7V13M12 17H12.01"
                      stroke="#DC2626"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                ) : (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M20 6L9 17L4 12"
                      stroke="#00875A"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                  </Svg>
                )}
                <Text
                  style={[
                    styles.statusText,
                    isRejected ? styles.statusTextRejected : styles.statusTextGreen,
                  ]}>
                  {isRejected ? 'Rejected' : displayStatus}
                </Text>
              </View>
            </View>
          </View>

          {/* CARD 2: OFFICER FEEDBACK */}
          {(isRejected || Boolean(officerComment) || Boolean(loanData?.reasonOfRejectionDetails)) && (
            <View style={styles.officerFeedbackCard}>
              <View style={styles.officerFeedbackTopRow}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                    stroke="#DC2626"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.officerFeedbackLabel}>OFFICER FEEDBACK</Text>
              </View>

              {Boolean(rejectionReason) && (
                <Text style={styles.feedbackReasonTitle}>{rejectionReason}</Text>
              )}

              {Boolean(officerComment) && (
                <Text style={styles.feedbackCommentBody}>{officerComment}</Text>
              )}

              {fieldListArray.length > 0 && (
                <View style={styles.feedbackAttentionSection}>
                  <Text style={styles.fieldsRequiringAttentionLabel}>
                    Fields requiring attention
                  </Text>
                  <View style={styles.fieldPillsRow}>
                    {fieldListArray.map((field, idx) => (
                      <View key={idx} style={styles.fieldPill}>
                        <Text style={styles.fieldPillText}>{field}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {Boolean(updatedByText) && (
                <Text style={styles.feedbackMetaText}>
                  Updated by {updatedByText}
                </Text>
              )}
            </View>
          )}

          {/* CARD 2: APPLICANT DETAILS */}
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

              {isPersonalEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('PersonalInfo', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppNumber,
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
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Full Name</Text>
                <Text style={styles.gridValue}>{user?.name || 'Saikat Dey'}</Text>
              </View>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Category</Text>
                <Text style={styles.gridValue}>{user?.category || 'General'}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Email</Text>
                <Text style={styles.gridValue}>
                  {user?.email && user.email.trim().length > 0
                    ? user.email
                    : 'Not provided'}
                </Text>
              </View>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Mobile</Text>
                <Text style={styles.gridValue}>
                  {user?.phone
                    ? `${user?.cc || '+91'} ${user.phone}`
                    : 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Aadhaar Number</Text>
                <Text style={styles.gridValue}>
                  {loanData?.aadhaarNo || user?.aadhaarNo || 'xxxx-xxxx-3755'}
                </Text>
              </View>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Date of Birth</Text>
                <Text style={styles.gridValue}>{formatDate(user?.dob)}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Gender</Text>
                <Text style={styles.gridValue}>{user?.gender || 'MALE'}</Text>
              </View>
              <View style={styles.columnHalf} />
            </View>
          </View>

          {/* CARD 3: ADDRESS */}
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
                    <Circle cx="12" cy="9" r="3" stroke="#00875A" strokeWidth={1.8} />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Address</Text>
              </View>

              {isAddressEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('AddressDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppNumber,
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
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Village / Locality</Text>
                <Text style={styles.gridValue}>{address?.locality || 'Diff'}</Text>
              </View>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>
                  Gram Panchayat / Municipality / Block
                </Text>
                <Text style={styles.gridValue}>{address?.panchayat || 'Sfdf'}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>District</Text>
                <Text style={styles.gridValue}>
                  {address?.districtName?.name || 'Chandel'}
                </Text>
              </View>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>State</Text>
                <Text style={styles.gridValue}>
                  {address?.stateName?.name || 'Manipur'}
                </Text>
              </View>
            </View>
          </View>

          {/* CARD 4: SELF HELP GROUP DETAILS */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxBlue]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                    <Circle cx="9" cy="7" r="4" stroke="#0284C7" strokeWidth={1.8} />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Self Help Group Details</Text>
              </View>

              {isShgEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('SHGDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppNumber,
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
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>SHG Name</Text>
                <Text style={styles.gridValue}>{shg?.shgName || 'Dadda'}</Text>
              </View>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>SHG ID</Text>
                <Text style={styles.gridValue}>{shg?.shgId || 'DFSDF'}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.columnHalf}>
                <Text style={styles.gridLabel}>Date of Formation</Text>
                <Text style={styles.gridValue}>{formatDate(shg?.dateOfFormation)}</Text>
              </View>
              <View style={styles.columnHalf} />
            </View>
          </View>

          {/* CARD 5: FAMILY & INCOME DETAILS */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxGreen]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Family & Income Details</Text>
              </View>

              {isIncomeEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('IncomeDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppNumber,
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
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.singleRow}>
              <Text style={styles.gridLabel}>Annual Family Income</Text>
              <Text style={styles.gridValue}>
                {cleanHtml(incomeRange?.name) || 'Rs. 2 lakh to Rs. 3 lakh'}
              </Text>
            </View>
          </View>

          {/* CARD 6: PROPOSED ECONOMIC ACTIVITY */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, styles.iconBoxBlue]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16Z"
                      stroke="#0284C7"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>Proposed Economic Activity</Text>
              </View>

              {isActivityEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('EconomicActivity', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppNumber,
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
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.singleRow}>
              <Text style={styles.gridLabel}>Economic Activity</Text>
              <Text style={styles.gridValue}>
                {occupation?.name || 'Dairy Farming'}
              </Text>
            </View>

            <View style={[styles.singleRow, {marginTop: 10}]}>
              <Text style={styles.gridLabel}>
                Description of Proposed Activity
              </Text>
              <Text style={styles.gridValue}>
                {loanData?.descriptionOfProposedActivity || 'Dsf'}
              </Text>
            </View>
          </View>

          {/* CARD 7: DECLARATION & APPLICATION STATUS */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIconBox, {backgroundColor: '#ECFDF5'}]}>
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
                    />
                  </Svg>
                </View>
                <Text style={styles.cardTitle}>
                  Declaration & Application Status
                </Text>
              </View>

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

            {/* GUARDIAN NAME INPUT */}
            <View style={styles.guardianInputSection}>
              <Text style={styles.guardianInputLabel}>
                Guardian Name (Father / Husband){' '}
                {canEditGuardian && <Text style={styles.redAsterisk}>*</Text>}
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
                <Text style={styles.guardianErrorText}>{guardianError}</Text>
              ) : (
                <Text style={styles.guardianHint}>
                  Please provide guardian (Father / Husband) full name for application records.
                </Text>
              )}
            </View>
          </View>

          {/* CARD 8: UPLOADED DOCUMENTS */}
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

              {isDocumentEditable && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('SHGDetails', {
                      loanId: activeLoanId,
                      applicationNumber: displayAppNumber,
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
                </TouchableOpacity>
              )}
            </View>

            {/* Document Preview Grid */}
            <View style={styles.docPreviewGrid}>
              {/* Photo */}
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
                  <View style={[styles.defaultFileIconBadge, {backgroundColor: '#FAF5FF'}]}>
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
                  <View style={[styles.fileFormatTag, {backgroundColor: '#EDE9FE'}]}>
                    <Text style={[styles.fileFormatText, {color: '#7C3AED'}]}>JPG / PNG</Text>
                  </View>
                  <View style={styles.docPreviewOverlay}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M15 3H21V9M21 3L14 10M10 14L3 21M3 21V15M3 21H9"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    </Svg>
                  </View>
                </View>
                <Text style={styles.docPreviewLabel} numberOfLines={1}>
                  Applicant Photo
                </Text>
              </TouchableOpacity>

              {/* Certificate */}
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
                        stroke="#00875A"
                        strokeWidth={1.8}
                      />
                      <Path
                        d="M8 13H16M8 17H13"
                        stroke="#00875A"
                        strokeWidth={1.8}
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
                      />
                    </Svg>
                  </View>
                </View>
                <Text style={styles.docPreviewLabel} numberOfLines={1}>
                  SHG Certificate
                </Text>
              </TouchableOpacity>

              {/* Bank Copy */}
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
                    title: 'Bank Passbook',
                    uri: bankUri,
                    fileName,
                    docType: 'Bank Account Passbook Copy',
                  });
                }}>
                <View style={[styles.docPreviewImageWrapper, styles.docPreviewFileWrapper]}>
                  <View style={[styles.defaultFileIconBadge, {backgroundColor: '#EFF6FF'}]}>
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                        fill="#EFF6FF"
                        stroke="#2563EB"
                        strokeWidth={1.8}
                      />
                      <Path
                        d="M14 2V8H20"
                        fill="#DBEAFE"
                        stroke="#2563EB"
                        strokeWidth={1.8}
                      />
                      <Path
                        d="M8 13H16M8 17H13"
                        stroke="#2563EB"
                        strokeWidth={1.8}
                      />
                    </Svg>
                  </View>
                  <View style={[styles.fileFormatTag, {backgroundColor: '#DBEAFE'}]}>
                    <Text style={[styles.fileFormatText, {color: '#1D4ED8'}]}>PASSBOOK</Text>
                  </View>
                  <View style={styles.docPreviewOverlay}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M15 3H21V9M21 3L14 10M10 14L3 21M3 21V15M3 21H9"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    </Svg>
                  </View>
                </View>
                <Text style={styles.docPreviewLabel} numberOfLines={1}>
                  Bank Passbook
                </Text>
              </TouchableOpacity>
            </View>
          </View>



          {/* BOTTOM BUTTONS */}
          <View style={styles.bottomButtonsRow}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                !(isRejected || hasCorrectionFields) && {flex: 1},
              ]}
              onPress={handleBack}
              disabled={isSubmitting}
              activeOpacity={0.75}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#00875A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            {(isRejected || hasCorrectionFields) && (
              <TouchableOpacity
                style={styles.editResubmitBtn}
                onPress={handleEditAndResubmit}
                activeOpacity={0.75}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89783 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                    stroke="#FFFFFF"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.editResubmitBtnText}>Edit & Resubmit</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Document Preview Modal */}
      <Modal
        visible={Boolean(previewDoc)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}>
        <View style={styles.docModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPreviewDoc(null)}
          />
          <View style={styles.docModalCard}>
            <View style={styles.docModalHeader}>
              <View style={styles.docModalHeaderLeft}>
                <View style={styles.docModalBadge}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                  </Svg>
                </View>
                <View>
                  <Text style={styles.docModalTitle}>
                    {previewDoc?.title || 'Document Preview'}
                  </Text>
                  <Text style={styles.docModalSubtitle}>
                    {previewDoc?.docType || 'Uploaded Document'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.docModalCloseBtn}
                onPress={() => setPreviewDoc(null)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            <View style={styles.docModalImageArea}>
              {previewDoc?.uri && !previewImageError ? (
                <Image
                  source={{uri: previewDoc.uri}}
                  style={styles.docModalFullImage}
                  resizeMode="contain"
                  onError={() => setPreviewImageError(true)}
                />
              ) : (
                <View style={styles.docModalFileFallback}>
                  <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                  </Svg>
                  <Text style={styles.docModalFallbackText}>
                    {previewDoc?.fileName || 'Document preview unavailable'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.docModalCloseAction}
              onPress={() => setPreviewDoc(null)}
              activeOpacity={0.85}>
              <Text style={styles.docModalCloseActionText}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Submission Success Modal */}
      <SubmissionSuccessModal
        visible={successModalVisible}
        applicationId={displayAppNumber}
        title="Application Submitted Successfully!"
        message={`Your application ${displayAppNumber} has been successfully submitted for verification. Tracking status is available on your dashboard.`}
        onGoToDashboard={() => {
          setSuccessModalVisible(false);
          navigation.reset({
            index: 0,
            routes: [{name: 'MainTabs'}],
          });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00875A',
  },
  centerLogo: {
    alignItems: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  titleSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingBannerText: {
    fontSize: 12,
    color: '#00875A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: '#ECFDF5',
  },
  iconBoxBlue: {
    backgroundColor: '#F0F9FF',
  },
  cardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusBadgeGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextGreen: {
    color: '#00875A',
  },
  statusTextRejected: {
    color: '#DC2626',
  },
  appDetailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  appDetailsHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  appDetailsOverline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  appDetailsNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  appDetailsDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appDetailsDateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  officerFeedbackCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    marginBottom: 16,
  },
  officerFeedbackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  officerFeedbackLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  feedbackReasonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 6,
  },
  feedbackCommentBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  feedbackAttentionSection: {
    marginTop: 14,
  },
  fieldsRequiringAttentionLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  fieldPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  fieldPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  feedbackMetaText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 14,
  },
  editResubmitBtn: {
    flex: 0.62,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  editResubmitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00875A',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  columnHalf: {
    flex: 0.48,
  },
  singleRow: {
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  editableDeclaredInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#00875A',
    paddingVertical: 2,
  },
  cardNoticeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  declarationInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  guardianInputSection: {
    marginTop: 6,
  },
  guardianInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  redAsterisk: {
    color: '#EF4444',
  },
  guardianInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    height: 46,
  },
  guardianInputWrapperFocused: {
    borderColor: '#00875A',
  },
  guardianInputWrapperError: {
    borderColor: '#EF4444',
  },
  guardianInputWrapperDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  guardianIcon: {
    marginRight: 8,
  },
  guardianTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  guardianTextInputDisabled: {
    color: '#64748B',
  },
  guardianErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  guardianHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  docPreviewGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  docPreviewCard: {
    flex: 1,
    alignItems: 'center',
  },
  docPreviewImageWrapper: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  docPreviewFileWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultFileIconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileFormatTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  fileFormatText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#00875A',
  },
  docPreviewOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 3,
  },
  docPreviewLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },
  confirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  confirmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
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
    fontSize: 11,
    fontWeight: '800',
  },
  confirmText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    fontWeight: '500',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0284C7',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryButton: {
    flex: 0.38,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00875A',
  },
  primaryButton: {
    flex: 0.62,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  docModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  docModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 16,
  },
  docModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  docModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docModalBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  docModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  docModalCloseBtn: {
    padding: 4,
  },
  docModalImageArea: {
    width: '100%',
    height: 300,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  docModalFullImage: {
    width: '100%',
    height: '100%',
  },
  docModalFileFallback: {
    alignItems: 'center',
    gap: 8,
  },
  docModalFallbackText: {
    fontSize: 12,
    color: '#64748B',
  },
  docModalCloseAction: {
    marginTop: 12,
    backgroundColor: '#00875A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  docModalCloseActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ApplicationDetailsScreen;
