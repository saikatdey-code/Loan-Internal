/**
 * HomeScreen — Main Dashboard screen for WEmanipur.
 * Matches the official design with:
 * - Top header with hamburger menu (☰), WEmanipur logo, and notification bell
 * - "WOMEN EMPOWERMENT MANIPUR" official badge
 * - "My Applications (1)" header with "+ Submit Application" button
 * - Application Status Card with:
 *   - Application ID, date, Submitted tag, options menu (⋮)
 *   - 3-column metrics: Current Stage, Days Elapsed, Last Updated
 *   - "Application is under review" green info box
 *   - "👁 View Details" outline button
 * - "Need assistance?" support card with toll-free, email, hours & "Get Help →"
 * - Slide-in AppDrawer navigation modal
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  PanResponder,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Logo, AppDrawer, NotificationModal, WatermarkBackground } from '../components';
import type { MainTabScreenProps, RootStackParamList } from '../types/navigation';
import { getLoanList, getLoanDetailsAuth, LoanListItem } from '../api/loan';
import { getAssistanceData, AssistanceData } from '../api/assistance';
import {
  setLoanId,
  getStoredLoanDetails,
  setStoredLoanDetails,
  getStoredAssistanceData,
  setStoredAssistanceData,
  clearAll,
  setHasCompletedOnboarding,
} from '../services/storage';

type Props = MainTabScreenProps<'Home'>;

/** Valid in-progress step names from the API */
const IN_PROGRESS_STEPS = [
  'aadharentry',
  'aadharverify',
  'personal',
  'address',
  'loanshg',
  'familyincome',
  'economyactivity',
  'loandetails',
  'bankdetails',
  'document',
];

/** Check if the application is in progress based on step or loanStatus */
const checkIsInProgress = (step?: string, loanStatus?: string): boolean => {
  const normalizedStep = (step || '').toLowerCase().trim().replace(/[-_\s]/g, '');
  // When step is 'review' or 'acknowledgement', application has been submitted
  if (
    normalizedStep === 'review' ||
    normalizedStep.startsWith('review') ||
    normalizedStep === 'acknowledgement' ||
    normalizedStep === 'acknowledgment'
  ) {
    return false;
  }
  if (IN_PROGRESS_STEPS.includes(normalizedStep)) {
    return true;
  }
  const normalizedStatus = (loanStatus || '').toLowerCase().trim().replace(/[-_\s]/g, '');
  return normalizedStatus === 'inprogress';
};

/** Map API step names to their corresponding screen in the navigation stack */
const getScreenForStep = (
  step?: string,
  loan?: LoanListItem | null,
): keyof RootStackParamList => {
  const isAadhaarUnverified =
    loan?.userDetails?.aadhaarVerified === false ||
    (loan as any)?.aadhaarVerified === false ||
    String(loan?.userDetails?.aadhaarVerified).toLowerCase() === 'false';

  if (isAadhaarUnverified) {
    return 'AadhaarAuth';
  }

  const normalized = (step || '').toLowerCase().trim().replace(/[-_\s]/g, '');
  if (
    normalized === 'aadharentry' ||
    normalized.startsWith('aadharentry') ||
    normalized.startsWith('aadhaarentry')
  ) {
    return 'AadhaarAuth';
  }
  if (
    normalized === 'aadharverify' ||
    normalized.startsWith('aadharverif') ||
    normalized.startsWith('aadhaarverif')
  ) {
    return 'AadhaarAuth';
  }
  if (normalized === 'personal' || normalized.startsWith('personal')) {
    return 'PersonalInfo';
  }
  if (normalized === 'address' || normalized.startsWith('address')) {
    return 'AddressDetails';
  }
  if (normalized === 'loanshg' || normalized.includes('shg')) {
    return 'SHGDetails';
  }
  if (normalized === 'familyincome' || normalized.includes('income')) {
    return 'IncomeDetails';
  }
  if (
    normalized === 'economyactivity' ||
    normalized.startsWith('econom') ||
    normalized.includes('activity') ||
    normalized.startsWith('proposed')
  ) {
    return 'EconomicActivity';
  }
  if (
    normalized === 'loandetails' ||
    normalized === 'bankdetails' ||
    normalized === 'document' ||
    normalized.startsWith('document') ||
    normalized === 'review' ||
    normalized.startsWith('review')
  ) {
    return 'ReviewApplication';
  }
  if (normalized === 'acknowledgement' || normalized === 'acknowledgment') {
    return 'ReviewApplication';
  }
  return 'PersonalInfo';
};

/** Human-readable stage label from the step name */
const getStepDisplayLabel = (
  step?: string,
  loan?: LoanListItem | null,
): string => {
  const isAadhaarUnverified =
    loan?.userDetails?.aadhaarVerified === false ||
    (loan as any)?.aadhaarVerified === false ||
    String(loan?.userDetails?.aadhaarVerified).toLowerCase() === 'false';

  if (isAadhaarUnverified) {
    return 'Aadhaar Verification';
  }

  const normalized = (step || '').toLowerCase().trim().replace(/[-_\s]/g, '');
  if (normalized === 'aadharentry') return 'Aadhaar Entry';
  if (normalized === 'aadharverify') return 'Aadhaar Verification';
  if (normalized.startsWith('personal')) return 'Personal Details';
  if (normalized === 'loanshg' || normalized.includes('shg')) return 'SHG Details';
  if (normalized.startsWith('address')) return 'Address Details';
  if (normalized === 'familyincome' || normalized.includes('income')) return 'Family & Income';
  if (
    normalized.startsWith('econom') ||
    normalized.includes('activity') ||
    normalized.startsWith('proposed')
  ) {
    return 'Proposed Activity';
  }
  if (normalized === 'loandetails') return 'Loan Details';
  if (normalized === 'bankdetails') return 'Bank Details';
  if (normalized.startsWith('doc')) return 'Document Upload';
  if (normalized.startsWith('review')) return 'Review Application';
  if (normalized.startsWith('acknowledg')) return 'Acknowledgement';
  return 'In Progress';
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeLoan, setActiveLoan] = useState<LoanListItem | null>(null);
  const [assistanceData, setAssistanceData] = useState<AssistanceData | null>(null);

  // Swipe from left edge of screen to slide open drawer
  const edgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Trigger only if touch starts within 35px of left screen edge and user drags right
        const isNearLeftEdge = evt.nativeEvent.pageX <= 35;
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
        const isSwipingRight = gestureState.dx > 12;
        return isNearLeftEdge && isHorizontal && isSwipingRight;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 15 || gestureState.vx > 0.3) {
          setIsDrawerOpen(true);
        }
      },
    }),
  ).current;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchLoans = async () => {
        try {
          const cached = await getStoredLoanDetails<any>();
          if (cached && isMounted) {
            setActiveLoan(cached);
          }
          const res = await getLoanList();
          if (res && res.success && res.data?.rows?.length > 0) {
            const firstLoan = res.data.rows[0];
            await setLoanId(firstLoan.id);
            if (isMounted) {
              setActiveLoan(firstLoan);
            }
            try {
              const fullDetails = await getLoanDetailsAuth(firstLoan.id);
              if (fullDetails?.success && fullDetails?.data) {
                const mergedLoan: any = {
                  ...firstLoan,
                  ...fullDetails.data,
                  userDetails: {
                    ...(firstLoan.userDetails || {}),
                    ...(fullDetails.data.userDetails || {}),
                    aadhaarVerified:
                      fullDetails.data.userDetails?.aadhaarVerified ??
                      firstLoan.userDetails?.aadhaarVerified,
                  },
                };
                if (isMounted) {
                  setActiveLoan(mergedLoan as LoanListItem);
                }
                await setStoredLoanDetails(mergedLoan);
              } else {
                await setStoredLoanDetails(firstLoan);
              }
            } catch (dErr) {
              console.warn('[HomeScreen] Failed to fetch full loan details:', dErr);
              await setStoredLoanDetails(firstLoan);
            }
          }
        } catch (err) {
          console.warn('[HomeScreen] Failed to fetch loans:', err);
        }
      };

      const fetchAssistance = async () => {
        try {
          const cached = await getStoredAssistanceData<AssistanceData>();
          if (cached && isMounted) {
            setAssistanceData(cached);
          }
          const res = await getAssistanceData();
          if (res && res.success && res.data && isMounted) {
            setAssistanceData(res.data);
            await setStoredAssistanceData(res.data);
          }
        } catch (err) {
          console.warn('[HomeScreen] Failed to fetch assistance data:', err);
        }
      };

      fetchLoans();
      fetchAssistance();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const displayAppNumber =
    activeLoan?.applicationNumber ||
    activeLoan?.applicationId ||
    '--';

  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return 'Recently';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  const appliedDate = formatDisplayDate(
    activeLoan?.appliedAt || activeLoan?.createdAt,
  );

  const lastUpdatedDate = formatDisplayDate(
    activeLoan?.updatedAt || activeLoan?.appliedAt || activeLoan?.createdAt,
  );

  const calculateElapsed = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${Math.max(1, diffMins)} minutes`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hours`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days`;
    } catch {
      return 'Recently';
    }
  };

  const elapsedText = calculateElapsed(
    activeLoan?.appliedAt || activeLoan?.createdAt,
  );

  const normalizedStep = (activeLoan?.step || '')
    .toLowerCase()
    .trim()
    .replace(/[-_\s]/g, '');

  const normalizedStatus = (activeLoan?.loanStatus || '')
    .toLowerCase()
    .trim()
    .replace(/[-_\s]/g, '');

  const isRejected = normalizedStatus === 'rejected';
  const isApproved = normalizedStatus === 'approved';
  const isSubmittedStatus = normalizedStatus === 'submitted';

  const isSubmittedApplication =
    !isRejected &&
    !isApproved &&
    (normalizedStep === 'review' ||
      normalizedStep.startsWith('review') ||
      normalizedStep === 'acknowledgement' ||
      normalizedStep === 'acknowledgment' ||
      isSubmittedStatus);

  const isInProgress =
    !isRejected &&
    !isApproved &&
    checkIsInProgress(activeLoan?.step, activeLoan?.loanStatus);

  const isAadhaarUnverified =
    Boolean(activeLoan) &&
    (activeLoan?.userDetails?.aadhaarVerified === false ||
      (activeLoan as any)?.aadhaarVerified === false ||
      String(activeLoan?.userDetails?.aadhaarVerified).toLowerCase() === 'false');

  const rejectionReason =
    activeLoan?.reasonOfRejectionDetails?.name ||
    (typeof activeLoan?.reasonOfRejection === 'string'
      ? activeLoan.reasonOfRejection
      : '');
  const officerComment = activeLoan?.officerComment;
  const hasCorrectionFields = Boolean(
    activeLoan?.fieldList &&
    (Array.isArray(activeLoan.fieldList)
      ? activeLoan.fieldList.length > 0
      : Object.keys(activeLoan.fieldList).length > 0),
  );
  const correctionFieldsFormatted = Array.isArray(activeLoan?.fieldList)
    ? activeLoan.fieldList.join(', ')
    : typeof activeLoan?.fieldList === 'string'
      ? activeLoan.fieldList
      : '';

  const correctionFieldsArray: string[] = (() => {
    const fl = activeLoan?.fieldList;
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
    return [];
  })();

  const updatedByText =
    activeLoan?.loanStatusUpdateByDetails?.name ||
    activeLoan?.loanStatusUpdateByDetails?.userName ||
    activeLoan?.updatedByUser?.name ||
    activeLoan?.updatedBy?.name ||
    (typeof activeLoan?.updatedBy === 'string' && activeLoan.updatedBy.trim()
      ? activeLoan.updatedBy
      : '') ||
    activeLoan?.officerName ||
    activeLoan?.actionBy?.name ||
    activeLoan?.rejectedBy ||
    'Super Admin';

  const getFirstCorrectionScreen = (): keyof RootStackParamList => {
    if (!activeLoan?.fieldList) return 'ApplicationDetails';
    const fl = activeLoan.fieldList;
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

  const handleSubmitNewApplication = () => {
    Alert.alert(
      'Submit New Application',
      'Starting a new application will log out your current session and proceed to Aadhaar authentication. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'default',
          onPress: async () => {
            try {
              await clearAll();
              await setHasCompletedOnboarding(true);
              const parentNav = navigation.getParent();
              if (parentNav) {
                (parentNav as any).reset({
                  index: 1,
                  routes: [{ name: 'Auth', params: { screen: 'Login' } }, { name: 'AadhaarAuth' }],
                });
              } else {
                (navigation as any).reset({
                  index: 1,
                  routes: [{ name: 'Auth', params: { screen: 'Login' } }, { name: 'AadhaarAuth' }],
                });
              }
            } catch (e) {
              console.warn('[HomeScreen] Failed to logout and navigate to AadhaarAuth:', e);
            }
          },
        },
      ],
    );
  };

  const handleApproveAadhaar = () => {
    const loanId = activeLoan?.id;
    const applicationNumber = displayAppNumber;
    const applicationId = activeLoan?.applicationId || activeLoan?.id;
    const fieldList = activeLoan?.fieldList;
    const loanStatus = activeLoan?.loanStatus;

    navigation.navigate('AadhaarAuth', {
      loanId,
      applicationNumber,
      applicationId,
      fromScreen: 'Home',
      fieldList,
      loanStatus,
    });
  };

  const handleViewDetails = () => {
    navigation.navigate('ApplicationDetails', {
      loanId: activeLoan?.id,
      applicationNumber: displayAppNumber,
      fieldList: activeLoan?.fieldList,
      loanStatus: activeLoan?.loanStatus,
    });
  };

  const handleEditAndResubmit = () => {
    const loanId = activeLoan?.id;
    const applicationNumber = displayAppNumber;
    const fieldList = activeLoan?.fieldList;
    const loanStatus = activeLoan?.loanStatus;

    const firstScreen = getFirstCorrectionScreen();
    navigation.navigate(firstScreen as any, {
      loanId,
      applicationNumber,
      fieldList,
      loanStatus,
      isEdit: true,
      loanDetails: activeLoan,
    });
  };

  const handleApplicationPress = () => {
    if (isAadhaarUnverified) {
      handleApproveAadhaar();
      return;
    }

    const loanId = activeLoan?.id;
    const applicationNumber = displayAppNumber;
    const fieldList = activeLoan?.fieldList;
    const loanStatus = activeLoan?.loanStatus;

    if (isInProgress) {
      const isAadhaarUnverified =
        activeLoan?.userDetails?.aadhaarVerified === false ||
        (activeLoan as any)?.aadhaarVerified === false ||
        String(activeLoan?.userDetails?.aadhaarVerified).toLowerCase() === 'false';

      const applicationId = activeLoan?.applicationId || activeLoan?.id;

      if (isAadhaarUnverified) {
        navigation.navigate('AadhaarAuth', {
          loanId,
          applicationNumber,
          applicationId,
          fromScreen: 'Home',
          fieldList,
          loanStatus,
        });
        return;
      }

      const targetScreen = getScreenForStep(activeLoan?.step, activeLoan);
      navigation.navigate(targetScreen as any, {
        loanId,
        applicationNumber,
        applicationId,
        fromScreen: 'Home',
        fieldList,
        loanStatus,
      });
    } else {
      navigation.navigate('ApplicationDetails', {
        loanId,
        applicationNumber,
        fieldList,
        loanStatus,
      });
    }
  };

  const handleOptionsPress = () => {
    const options: {
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[] = [];

    if (isAadhaarUnverified) {
      options.push({
        text: 'Approve Aadhaar',
        onPress: handleApproveAadhaar,
      });
      options.push({
        text: 'View Details',
        onPress: handleViewDetails,
      });
    } else if (isInProgress) {
      options.push({
        text: 'Continue',
        onPress: handleApplicationPress,
      });
    } else if (isRejected) {
      options.push({
        text: 'View Details',
        onPress: handleViewDetails,
      });
      options.push({
        text: 'Edit & Resubmit',
        onPress: handleEditAndResubmit,
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Application Options', `Application: ${displayAppNumber}`, options);
  };

  const assistancePhone = assistanceData?.phone || '1800-XXX-XXXX';
  const assistanceEmail = assistanceData?.email || 'support@wemanipur.gov.in';
  const assistanceTiming =
    assistanceData?.timing || 'Mon - Sat, 9:00 AM to 6:00 PM';

  const handleCallAssistance = () => {
    const cleanPhone = assistancePhone.replace(/[^0-9+]/g, '');
    if (cleanPhone) {
      Linking.openURL(`tel:${cleanPhone}`).catch(err => {
        console.warn('[HomeScreen] Could not open phone dialer:', err);
      });
    }
  };

  const handleEmailAssistance = () => {
    if (assistanceEmail) {
      Linking.openURL(`mailto:${assistanceEmail}`).catch(err => {
        console.warn('[HomeScreen] Could not open mail client:', err);
      });
    }
  };

  const handleNotificationPress = () => {
    setIsNotificationOpen(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* ══════════════════════════════════════════════════════
          TOP APP BAR (Hamburger Menu + Logo + Notification)
         ══════════════════════════════════════════════════════ */}
      <View style={styles.topBar}>
        {/* Hamburger Menu Icon */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsDrawerOpen(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 6H21M3 12H21M3 18H21"
              stroke="#00875A"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════
          MAIN SCROLLABLE CONTENT
         ══════════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Shield Scheme Badge */}


        {/* Title Header */}
        <View style={styles.titleRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.sectionHeading}>
              My Applications ({activeLoan ? 1 : 0})
            </Text>
            <Text style={styles.sectionSub}>
              Track the status of your application and stay updated.
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            CARD: ACTIVE APPLICATION STATUS
           ══════════════════════════════════════════════════════ */}
        <View style={[styles.applicationCard, isAadhaarUnverified && styles.aadhaarApprovalCard]}>
          {isAadhaarUnverified ? (
            <View style={styles.aadhaarApprovalCenteredWrap}>
              <TouchableOpacity
                style={styles.approveAadhaarCenteredButton}
                onPress={handleApproveAadhaar}
                activeOpacity={0.75}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                    stroke="#2563EB"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 12L11 14L15 10"
                    stroke="#2563EB"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.approveAadhaarCenteredText}>
                  Approve your Aadhaar
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Top Row: Icon + ID + Date + Tag + 3-dots */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.docIconBox,
                  isRejected && styles.docIconBoxRejected,
                ]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                    stroke={isRejected ? '#DC2626' : '#00875A'}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M14 2V8H20"
                    stroke={isRejected ? '#DC2626' : '#00875A'}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M16 13H8M16 17H8M10 9H8"
                    stroke={isRejected ? '#DC2626' : '#00875A'}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>

              <View style={styles.appIdInfo}>
                <Text style={styles.appNoLabel}>Application No.</Text>
                <Text
                  style={[
                    styles.appNumberText,
                    isRejected && styles.appNumberTextRejected,
                  ]}>
                  {displayAppNumber}
                </Text>
                <Text style={styles.appliedDateText}>
                  Applied on: {appliedDate}
                </Text>

                <View
                  style={[
                    styles.submittedPill,
                    isRejected && styles.rejectedPill,
                    isApproved && styles.approvedPill,
                    isInProgress && styles.inProgressPill,
                  ]}>
                  <Text
                    style={[
                      styles.submittedPillText,
                      isRejected && styles.rejectedPillText,
                      isApproved && styles.approvedPillText,
                      isInProgress && styles.inProgressPillText,
                    ]}>
                    {isRejected
                      ? 'Rejected'
                      : isApproved
                        ? 'Approved'
                        : isInProgress
                          ? 'In Progress'
                          : activeLoan?.loanStatus
                            ? activeLoan.loanStatus.charAt(0).toUpperCase() +
                            activeLoan.loanStatus.slice(1)
                            : 'Submitted'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Three Dots Menu (⋮) */}
            <TouchableOpacity
              onPress={handleOptionsPress}
              style={styles.optionsButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="5" r="2" fill="#94A3B8" />
                <Circle cx="12" cy="12" r="2" fill="#94A3B8" />
                <Circle cx="12" cy="19" r="2" fill="#94A3B8" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* 3-Column Metrics Section */}
          <View style={styles.metricsContainer}>
            {/* Col 1: Current Stage */}
            <View style={styles.metricColumn}>
              <View style={styles.metricIconWrap}>
                {/* 3 layered discs icon */}
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M2 17L12 22L22 17"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M2 12L12 17L22 12"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={styles.metricLabel}>Current Stage</Text>
              <Text
                style={[
                  styles.metricStageValue,
                  isRejected && styles.metricStageValueRejected,
                  isApproved && styles.metricStageValueApproved,
                ]}>
                {isRejected
                  ? 'Application Rejected'
                  : isApproved
                    ? 'Application Approved'
                    : isInProgress
                      ? getStepDisplayLabel(activeLoan?.step, activeLoan)
                      : 'Application Submitted'}
              </Text>
              <View
                style={[
                  styles.miniSubmittedTag,
                  isRejected && styles.miniRejectedTag,
                  isApproved && styles.miniApprovedTag,
                  isInProgress && styles.miniInProgressTag,
                ]}>
                <Text
                  style={[
                    styles.miniSubmittedText,
                    isRejected && styles.miniRejectedText,
                    isApproved && styles.miniApprovedText,
                    isInProgress && styles.miniInProgressText,
                  ]}>
                  {isRejected
                    ? 'Rejected'
                    : isApproved
                      ? 'Approved'
                      : isInProgress
                        ? 'In Progress'
                        : activeLoan?.loanStatus
                          ? activeLoan.loanStatus.charAt(0).toUpperCase() +
                          activeLoan.loanStatus.slice(1)
                          : 'Submitted'}
                </Text>
              </View>
            </View>

            {/* Vertical separator */}
            <View style={styles.verticalSep} />

            {/* Col 2: Days Elapsed */}
            {/* <View style={styles.metricColumn}>
              <View style={styles.metricIconWrap}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="#00875A"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M12 7V12L15 15"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.metricLabel}>Days Elapsed</Text>
              <Text style={styles.metricNumberValue}>{elapsedText}</Text>
            </View> */}

            {/* Vertical separator */}
            <View style={styles.verticalSep} />

            {/* Col 3: Last Updated */}
            <View style={styles.metricColumn}>
              <View style={styles.metricIconWrap}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="#00875A"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M16 2V6M8 2V6M3 10H21"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.metricLabel}>Last Updated</Text>
              <Text style={styles.metricNumberValue}>{lastUpdatedDate}</Text>
            </View>
          </View>

          {isRejected ? (
            <View style={styles.rejectionSection}>
              {/* Action Required Header */}
              <View style={styles.actionRequiredHeader}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth={2} />
                  <Path
                    d="M12 7V13M12 17H12.01"
                    stroke="#DC2626"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={styles.actionRequiredTitle}>Action required</Text>
              </View>

              <Text style={styles.actionRequiredDescription}>
                Your application has been rejected. Review the details and make the required changes.
              </Text>

              {/* Officer Feedback Box */}
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
                  <Text style={styles.officerFeedbackLabel}>Officer Feedback</Text>
                </View>

                {/* Reason Title */}
                {Boolean(rejectionReason) && (
                  <Text style={styles.feedbackReasonTitle}>{rejectionReason}</Text>
                )}

                {/* Officer Comment Body */}
                {Boolean(officerComment) && (
                  <Text style={styles.feedbackCommentBody}>{officerComment}</Text>
                )}

                {/* Optional corrections list if specified */}
                {correctionFieldsArray.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 }}>
                      Fields requiring attention
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {correctionFieldsArray.map((field, idx) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: '#FEE2E2',
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: 16,
                          }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#991B1B' }}>
                            {field}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : Boolean(correctionFieldsFormatted) ? (
                  <Text style={styles.feedbackCorrectionsLine}>
                    Corrections requested for: {correctionFieldsFormatted}
                  </Text>
                ) : null}

                {/* Updated by footer */}
                <Text style={styles.feedbackMetaText}>
                  Updated by {updatedByText} · {lastUpdatedDate}
                </Text>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.rejectionActionsRow}>
                {/* Button 1: View Details */}
                <TouchableOpacity
                  style={styles.viewDetailsOutlineBtn}
                  onPress={handleViewDetails}
                  activeOpacity={0.75}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
                      stroke="#2563EB"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Circle cx="12" cy="12" r="3" stroke="#2563EB" strokeWidth={1.8} />
                  </Svg>
                  <Text style={styles.viewDetailsOutlineBtnText}>View Details</Text>
                </TouchableOpacity>

                {/* Button 2: Edit & Resubmit */}
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
              </View>
            </View>
          ) : (
            <>
              {/* Notice Container for Approved / In Progress / Under Review */}
              <View
                style={[
                  styles.reviewNoticeBox,
                  isApproved && styles.approvedNoticeBox,
                ]}>
                <View style={styles.infoCircleWrap}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    {isApproved ? (
                      <>
                        <Circle cx="12" cy="12" r="10" stroke="#15803D" strokeWidth={1.8} />
                        <Path
                          d="M8 12L11 15L16 9"
                          stroke="#15803D"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    ) : (
                      <>
                        <Circle cx="12" cy="12" r="10" stroke="#00875A" strokeWidth={1.8} />
                        <Path
                          d="M12 16V12M12 8H12.01"
                          stroke="#00875A"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </Svg>
                </View>
                <View style={styles.reviewNoticeTextWrap}>
                  <Text
                    style={[
                      styles.reviewNoticeHeading,
                      isApproved && styles.approvedNoticeHeading,
                    ]}>
                    {isAadhaarUnverified
                      ? 'Please verify your identity to process your application.'
                      : isApproved
                        ? 'Application Approved'
                        : isInProgress
                          ? 'Application is in progress'
                          : 'Application is under review'}
                  </Text>
                  <Text style={styles.reviewNoticeDescription}>
                    {isAadhaarUnverified
                      ? 'You will be notified once there is an update.'
                      : isApproved
                        ? 'Congratulations! Your loan application has been approved. You will be contacted soon regarding disbursement.'
                        : isInProgress
                          ? 'Your application is currently incomplete.\nTap Continue to proceed with your application.'
                          : 'Your application is fully completed, submitted, and currently\nunder review. You will be notified once there is an update.'}
                  </Text>
                </View>
              </View>

              {/* Action Button: Continue */}
              {isInProgress ? (
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={handleApplicationPress}
                  activeOpacity={0.75}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke="#2563EB"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.viewDetailsText}>Continue</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </>
      )}
    </View>

        {/* ══════════════════════════════════════════════════════
            CARD: NEED ASSISTANCE?
           ══════════════════════════════════════════════════════ */}


        {/* Bottom spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edge swipe zone on left screen border to slide open drawer */}
      <View
        style={styles.leftEdgeSwipeStrip}
        pointerEvents={isDrawerOpen ? 'none' : 'auto'}
        {...edgePanResponder.panHandlers}
      />

      {/* ══════════════════════════════════════════════════════
          SLIDE-IN DRAWER NAVIGATION MODAL
         ══════════════════════════════════════════════════════ */}
      <AppDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigation={navigation}
        userName="--"
      />

      {/* Notifications Modal */}
      <NotificationModal
        visible={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNotificationPress={() => {
          setIsNotificationOpen(false);
          handleApplicationPress();
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
  mainScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  leftEdgeSwipeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 9,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuButton: {
    padding: 6,
  },
  logoCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButton: {
    padding: 6,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  schemeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 14,
  },
  schemeTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00875A',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 4,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  submitAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00875A',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
    flexShrink: 0,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitAppPlus: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  submitAppText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Application Card ───────────────────────────────────────
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF8F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  docIconBoxRejected: {
    backgroundColor: '#FEE2E2',
  },
  appIdInfo: {
    flex: 1,
  },
  appNoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  appNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00875A',
    marginTop: 1,
    marginBottom: 2,
  },
  appNumberTextRejected: {
    color: '#DC2626',
  },
  appliedDateText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  submittedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  submittedPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00875A',
  },
  rejectedPill: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectedPillText: {
    color: '#DC2626',
  },
  approvedPill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  approvedPillText: {
    color: '#15803D',
  },
  inProgressPill: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  inProgressPillText: {
    color: '#2563EB',
  },
  metricStageValueRejected: {
    color: '#DC2626',
  },
  metricStageValueApproved: {
    color: '#15803D',
  },
  miniRejectedTag: {
    backgroundColor: '#FEE2E2',
  },
  miniRejectedText: {
    color: '#DC2626',
  },
  miniApprovedTag: {
    backgroundColor: '#DCFCE7',
  },
  miniApprovedText: {
    color: '#15803D',
  },
  miniInProgressTag: {
    backgroundColor: '#DBEAFE',
  },
  miniInProgressText: {
    color: '#2563EB',
  },
  rejectedNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  rejectedNoticeHeading: {
    color: '#DC2626',
  },
  approvedNoticeBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  approvedNoticeHeading: {
    color: '#15803D',
  },
  rejectionReasonBold: {
    fontWeight: '700',
    color: '#991B1B',
  },
  rejectionActionText: {
    fontWeight: '600',
    color: '#B91C1C',
    marginTop: 3,
  },
  viewDetailsButtonRejected: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  viewDetailsTextRejected: {
    color: '#DC2626',
  },
  optionsButton: {
    padding: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  // 3-Column Metrics
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconWrap: {
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
    textAlign: 'center',
  },
  metricStageValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  metricNumberValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  miniSubmittedTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniSubmittedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803D',
  },
  verticalSep: {
    width: 1,
    height: 38,
    backgroundColor: '#E2E8F0',
  },

  // Under Review Notice
  reviewNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  infoCircleWrap: {
    marginTop: 1,
  },
  reviewNoticeTextWrap: {
    flex: 1,
  },
  reviewNoticeHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00875A',
    marginBottom: 2,
  },
  reviewNoticeDescription: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },

  // View Details Outline Button
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
  },
  viewDetailsText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  approveAadhaarButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
    gap: 7,
  },
  approveAadhaarText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#2563EB',
  },
  aadhaarApprovalCard: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  aadhaarApprovalCenteredWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveAadhaarCenteredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  approveAadhaarCenteredText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },

  // ── Rejection Feedback Section (matches Web Portal) ────────
  rejectionSection: {
    marginTop: 2,
    marginBottom: 4,
  },
  actionRequiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  actionRequiredTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionRequiredDescription: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  officerFeedbackCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  officerFeedbackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  officerFeedbackLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  feedbackReasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7F1D1D',
    marginBottom: 4,
  },
  feedbackCommentBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 2,
  },
  feedbackCorrectionsLine: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    marginTop: 6,
  },
  feedbackMetaText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
  },
  rejectionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewDetailsOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  viewDetailsOutlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  editResubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  editResubmitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Need Assistance Card ───────────────────────────────────
  assistanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  assistanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  assistanceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistanceTitleWrap: {
    flex: 1,
  },
  assistanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  assistanceSub: {
    fontSize: 11,
    color: '#64748B',
  },
  assistanceDetailsList: {
    gap: 8,
    marginBottom: 10,
  },
  assistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assistanceText: {
    fontSize: 12,
    color: '#334155',
  },
  getHelpAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  getHelpActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00875A',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default HomeScreen;
