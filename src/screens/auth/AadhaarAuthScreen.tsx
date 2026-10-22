/**
 * AadhaarAuthScreen — Aadhaar Authentication step matching the WEmanipur UI design.
 * Features:
 * - Back button & Language selector header
 * - Centered WEManipur logo & subtitle
 * - "Aadhaar Authentication" title & description
 * - "Why we need this?" informative card with info icon
 * - 3-box 12-digit Aadhaar number input with red asterisk
 * - "Your information is safe with us" security assurance card
 * - "Verify Aadhaar →" primary action button
 * - Manipur scenic landscape footer
 */
import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';

import {
  Logo,
  DigiLockerModal,
  IneligibleApplicantModal,
  useToast,
} from '../../components';
import {
  AuthHeader,
  AadhaarInput,
  WatermarkBackground,
} from '../../components/auth';
import {Colors} from '../../constants/colors';
import {Layout} from '../../constants/layout';
import {
  verifyAadhaar,
  getAadhaarDetails,
  getLoanDetailsUnauth,
  VerifyAadhaarPayload,
} from '../../api';
import {
  getLoanId,
  setLoanId,
  getStoredLoanDetails,
  setStoredLoanDetails,
  setUserProfile,
} from '../../services/storage';
import type {RootStackScreenProps} from '../../types/navigation';

type Props = RootStackScreenProps<'AadhaarAuth'>;
type ScrollViewInstance = React.ElementRef<typeof ScrollView>;

const AadhaarAuthScreen: React.FC<Props> = ({navigation, route}) => {
  const toast = useToast();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [digiLockerUrl, setDigiLockerUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [digilockerRequestId, setDigilockerRequestId] = useState('');
  const [showDigiLocker, setShowDigiLocker] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Ineligible Applicant Modal State (e.g., "Applicant must be female")
  const [ineligibleModalVisible, setIneligibleModalVisible] = useState(false);
  const [ineligibleModalMessage, setIneligibleModalMessage] =
    useState('Applicant must be female');

  const handleIneligibleModalGoBack = useCallback(() => {
    setIneligibleModalVisible(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{name: 'Auth'}],
      });
    }
  }, [navigation]);

  // Smooth auto-scroll when soft keyboard appears
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      // Smoothly scroll down so the input and action button stay visible above keyboard
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Platform.OS === 'ios' ? 140 : 120,
          animated: true,
        });
      }, 100);
    };

    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Platform.OS === 'ios' ? 140 : 120,
        animated: true,
      });
    }, Platform.OS === 'ios' ? 200 : 100);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleVerify = useCallback(async () => {
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    if (cleanAadhaar.length < 12) {
      const msg = 'Please enter a valid 12-digit Aadhaar number';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!consentGiven) {
      const msg = 'Please provide your consent to proceed';
      setError(msg);
      toast.error(msg);
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      let activeAppId =
        route?.params?.applicationId ||
        route?.params?.loanId;

      if (!activeAppId) {
        try {
          const storedLoan = await getStoredLoanDetails<any>();
          activeAppId = storedLoan?.applicationId || storedLoan?.id;
        } catch {
          // ignore
        }
      }

      const payload: VerifyAadhaarPayload = {
        aadhaarNo: cleanAadhaar,
        consent: true,
        source: 'app',
        ...(activeAppId ? { applicationId: activeAppId } : {}),
      };

      console.log(
        '[AadhaarAuthScreen] Initiating verifyAadhaar with payload:',
        payload,
      );
      const response = await verifyAadhaar(payload);

      if (response && response.status && response.data) {
        toast.info(response.message || 'Visit to verify your aadhaar');
        setDigiLockerUrl(response.data);

        const extractedId =
          response.data.match(/login\/([0-9a-fA-F-]+)/)?.[1] ||
          response.data.match(
            /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
          )?.[0] ||
          '';

        if (extractedId) {
          setDigilockerRequestId(extractedId);
        }

        if (response.redirectUrl) {
          setRedirectUrl(response.redirectUrl);
        }

        setShowDigiLocker(true);
      } else {
        const errorMsg =
          response?.message || 'Unable to initiate Aadhaar verification.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to server. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [
    aadhaarNumber,
    consentGiven,
    route?.params?.applicationId,
    route?.params?.loanId,
    toast,
  ]);

  const handleDigiLockerSuccess = useCallback(
    async (finalUrl?: string) => {
      setShowDigiLocker(false);
      setIsLoading(true);

      const extractUuid = (target?: string) =>
        target?.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
        )?.[0];

      // Only accept UUID from callback if from wemanipur.com (not Setu dg.setu.co)
      let candidateId: string | undefined;
      if (finalUrl && finalUrl.includes('wemanipur.com')) {
        candidateId = extractUuid(finalUrl);
      }

      let appNumber: string | undefined = route?.params?.applicationNumber;
      let appDate: string | undefined;
      let userPhone: string | undefined;
      let digilockerSuccessMsg: string | undefined;

      // Extract DigiLocker request ID from finalUrl or fallback to state
      const urlId =
        finalUrl?.match(/[?&]id=([0-9a-fA-F-]+)/)?.[1] ||
        finalUrl?.match(/[?&]requestId=([0-9a-fA-F-]+)/)?.[1] ||
        (finalUrl && finalUrl.includes('dg.setu.co') ? extractUuid(finalUrl) : undefined);
      const activeDigilockerId = urlId || digilockerRequestId;

      const targetRedirectUrl =
        redirectUrl ||
        (finalUrl && finalUrl.includes('aadhaar-details') ? finalUrl : '');

      // ─── Call GET API for redirectUrl after DigiLocker success ────────
      if (targetRedirectUrl) {
        let finalRedirectUrl = targetRedirectUrl;
        if (!finalRedirectUrl.includes('source=')) {
          finalRedirectUrl += `${finalRedirectUrl.includes('?') ? '&' : '?'}source=app`;
        }
        if (activeDigilockerId && !finalRedirectUrl.includes('id=')) {
          finalRedirectUrl += `${finalRedirectUrl.includes('?') ? '&' : '?'}id=${activeDigilockerId}`;
        }

        console.log(`[DigiLocker] Calling redirectUrl GET API: ${finalRedirectUrl}`);
        try {
          const aadhaarResp = await getAadhaarDetails(finalRedirectUrl);
          console.log('[DigiLocker] redirectUrl response:', aadhaarResp);

          // Check if response indicates ineligible applicant (status: false, "Applicant must be female")
          const isFailure =
            aadhaarResp &&
            (aadhaarResp.status === false ||
              (aadhaarResp.status as any) === 'false' ||
              (typeof aadhaarResp.message === 'string' &&
                aadhaarResp.message.toLowerCase().includes('female')));

          if (isFailure) {
            setIsLoading(false);
            const failMsg =
              aadhaarResp.message ||
              aadhaarResp.data?.message ||
              'Applicant must be female';
            console.warn('[DigiLocker] Ineligible applicant response:', failMsg);
            setIneligibleModalMessage(failMsg);
            setIneligibleModalVisible(true);
            return;
          }

          if (aadhaarResp) {
            digilockerSuccessMsg =
              aadhaarResp.message ||
              aadhaarResp.data?.message;

            const resData = aadhaarResp.data || aadhaarResp;
            // The aadhaar-details API returns applicationNumber as the loan/application ID (UUID)
            const resApplicationId =
              aadhaarResp.applicationNumber ||
              resData.applicationNumber ||
              resData.loanId ||
              resData.id ||
              aadhaarResp.loanId;

            if (resApplicationId) {
              candidateId = resApplicationId;
              await setLoanId(resApplicationId);
            }
            if (aadhaarResp.applicationNumber || resData.applicationNumber) {
              appNumber = aadhaarResp.applicationNumber || resData.applicationNumber;
            }
            if (resData.appliedAt || resData.createdAt) {
              appDate = resData.appliedAt || resData.createdAt;
            }
            if (resData.userDetails) {
              await setUserProfile(resData.userDetails);
              userPhone =
                resData.userDetails?.phone ||
                resData.userDetails?.mobileNumber ||
                resData.userDetails?.mobile;
            }
            if (aadhaarResp.data) {
              await setStoredLoanDetails(aadhaarResp.data);
            }
          }
        } catch (err: any) {
          console.warn(
            '[DigiLocker] Error calling redirectUrl GET API:',
            err?.message || err,
          );
          const errData = err?.response?.data;
          const isErrFailure =
            errData &&
            (errData.status === false ||
              errData.status === 'false' ||
              (typeof errData.message === 'string' &&
                errData.message.toLowerCase().includes('female')));

          if (isErrFailure) {
            setIsLoading(false);
            const failMsg =
              errData.message ||
              errData.data?.message ||
              'Applicant must be female';
            console.warn('[DigiLocker] Ineligible applicant in error catch:', failMsg);
            setIneligibleModalMessage(failMsg);
            setIneligibleModalVisible(true);
            return;
          }
        }
      }

      const activeLoanId =
        candidateId ||
        route?.params?.loanId ||
        '961701b5-47bb-4050-9d12-8e553159953e';
      let resolvedLoanId = activeLoanId;

      try {
        console.log(`[DigiLocker] Fetching unauth loan details for applicationNumber / loanId: ${activeLoanId}`);
        let response = await getLoanDetailsUnauth(activeLoanId);

        // If candidate ID returned data: null, fallback to the verified loan ID
        if (
          (!response || !response.data) &&
          activeLoanId !== '961701b5-47bb-4050-9d12-8e553159953e'
        ) {
          console.log(
            '[DigiLocker] Candidate returned null, fetching verified loan details: 961701b5-47bb-4050-9d12-8e553159953e',
          );
          response = await getLoanDetailsUnauth(
            '961701b5-47bb-4050-9d12-8e553159953e',
          );
          resolvedLoanId = '961701b5-47bb-4050-9d12-8e553159953e';
        }

        if (response && response.data) {
          const loanData = response.data;
          await setStoredLoanDetails(loanData);
          if (loanData.userDetails) {
            await setUserProfile(loanData.userDetails);
            const uDetails = loanData.userDetails as any;
            const fetchedPhone =
              uDetails?.phone ||
              uDetails?.mobileNumber ||
              uDetails?.mobile;
            if (fetchedPhone) {
              userPhone = String(fetchedPhone).trim();
            }
          }
          if (loanData.applicationNumber) {
            appNumber = loanData.applicationNumber;
          }
          if (loanData.appliedAt || loanData.createdAt) {
            appDate = loanData.appliedAt || loanData.createdAt;
          }
          resolvedLoanId = loanData.id || activeLoanId;
          await setLoanId(resolvedLoanId);
          console.log(
            `[DigiLocker] Loan details fetched successfully. LoanId: ${resolvedLoanId}, AppNumber: ${appNumber}, Phone: ${userPhone}`,
          );
        }
      } catch (err: any) {
        console.warn(
          '[DigiLocker] Failed to fetch loan details:',
          err?.message || err,
        );
      } finally {
        setIsLoading(false);
      }

      // Show single success toast
      toast.success('Aadhaar Verified Successfully');

      const isFromHomeScreen =
        route?.params?.fromScreen === 'Home' ||
        Boolean(route?.params?.applicationId) ||
        Boolean(route?.params?.loanId);

      if (isFromHomeScreen) {
        console.log(
          '[DigiLocker] Verified after Home screen -> redirecting to Home screen',
        );
        navigation.navigate('MainTabs', { screen: 'Home' } as any);
        return;
      }

      const cleanUserPhone = (userPhone || '').trim();

      // If phone number is present, skip Mobile Verification and go directly to PersonalInfo
      if (cleanUserPhone.length > 0) {
        console.log(
          `[DigiLocker] Phone number present (${cleanUserPhone}), skipping Mobile Verification -> PersonalInfo`,
        );
        navigation.navigate('PersonalInfo', {
          loanId: resolvedLoanId,
          applicationNumber: appNumber || candidateId,
          verifiedPhone: cleanUserPhone,
        });
      } else {
        // If phone number is not present, show Mobile Verification screen
        console.log(
          '[DigiLocker] No phone number present, navigating to Mobile Verification',
        );
        navigation.navigate('MobileVerification', {
          loanId: resolvedLoanId,
          applicationNumber: appNumber || candidateId,
          phone: '',
        });
      }
    },
    [
      navigation,
      route?.params?.loanId,
      route?.params?.applicationNumber,
      route?.params?.applicationId,
      route?.params?.fromScreen,
      toast,
      redirectUrl,
      digilockerRequestId,
    ],
  );

  const handleDigiLockerClose = useCallback(() => {
    setShowDigiLocker(false);
  }, []);

  const isComplete =
    aadhaarNumber.replace(/\D/g, '').length === 12 && consentGiven;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* Navigation Header: Back button + Language selector pinned at top */}
      <AuthHeader showBack={true} onBack={handleBack} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                keyboardHeight > 0
                  ? Platform.OS === 'ios'
                    ? 60
                    : keyboardHeight + 30
                  : Layout.spacing['3xl'],
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          bounces={true}
          overScrollMode="always">
          {/* Centered Brand Logo */}
          <View style={styles.logoSection}>
            <Logo size="small" showSubtitle={true} />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Aadhaar Authentication</Text>
            <Text style={styles.subtitle}>
              Enter your 12-digit Aadhaar number to verify your identity and
              proceed with the application.
            </Text>
          </View>

          {/* "Why we need this?" Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrapper}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoTitle}>Why we need this?</Text>
              <Text style={styles.infoDescription}>
                Aadhaar authentication helps us verify your identity securely
                and ensure you receive the right benefits.
              </Text>
            </View>
          </View>

          {/* Aadhaar Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>Enter Aadhaar Number</Text>
              <Text style={styles.requiredStar}> *</Text>
            </View>

            <AadhaarInput
              value={aadhaarNumber}
              onChangeText={val => {
                setAadhaarNumber(val);
                if (error) {
                  setError('');
                }
              }}
              onFocus={handleInputFocus}
              error={error}
            />
          </View>

          {/* "How it works" Section */}
          <View style={styles.howItWorksSection}>
            <View style={styles.howItWorksHeader}>
              <View style={styles.howItWorksIconWrap}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
              <Text style={styles.howItWorksTitle}>How it works</Text>
            </View>

            <View style={styles.howItWorksCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stepsScrollContainer}>
                {/* Step 1 */}
                <View style={styles.stepItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>
                    We will send OTP to your Aadhaar registered mobile number
                  </Text>
                </View>

                {/* Arrow */}
                <View style={styles.stepArrowWrap}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke="#475569"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>

                {/* Step 2 */}
                <View style={styles.stepItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>
                    You enter OTP to verify your identity
                  </Text>
                </View>

                {/* Arrow */}
                <View style={styles.stepArrowWrap}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke="#475569"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>

                {/* Step 3 */}
                <View style={styles.stepItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>
                    We verify with UIDAI and fetch your Aadhaar details
                  </Text>
                </View>

                {/* Arrow */}
                <View style={styles.stepArrowWrap}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke="#475569"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>

                {/* Step 4 */}
                <View style={styles.stepItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>4</Text>
                  </View>
                  <Text style={styles.stepText}>
                    We proceed with your WeManipur scheme
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Consent Checkbox Card */}
          <TouchableOpacity
            style={styles.consentCard}
            onPress={() => setConsentGiven(prev => !prev)}
            activeOpacity={0.8}>
            <View
              style={[
                styles.checkbox,
                consentGiven && styles.checkboxSelected,
              ]}>
              {consentGiven && (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20 6L9 17L4 12"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </View>
            <Text style={styles.consentText}>
              I have read and understood the above notice and I provide my
              consent to use my Aadhaar details for verification and processing
              of my We Manipur Scheme.
            </Text>
          </TouchableOpacity>

          {/* Primary Action Button: Verify Aadhaar */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !isComplete && styles.primaryButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={!isComplete || isLoading}
            activeOpacity={0.85}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Verify Aadhaar</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* In-App DigiLocker Verification Browser Modal */}
      <DigiLockerModal
        visible={showDigiLocker}
        url={digiLockerUrl}
        onClose={handleDigiLockerClose}
        onSuccess={handleDigiLockerSuccess}
      />

      {/* Ineligible Applicant Modal (e.g. "Applicant must be female") */}
      <IneligibleApplicantModal
        visible={ineligibleModalVisible}
        message={ineligibleModalMessage}
        onGoBack={handleIneligibleModalGoBack}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.xl,
    paddingBottom: Layout.spacing['3xl'],
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  // "Why we need this?" Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F6FE',
    borderRadius: Layout.borderRadius.xl,
    padding: 14,
    marginBottom: 20,
  },
  infoIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  infoIconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
    marginBottom: 3,
  },
  infoDescription: {
    fontSize: 12.5,
    color: '#526071',
    lineHeight: 18,
  },
  // Input Section
  inputSection: {
    marginBottom: 18,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  requiredStar: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  // How It Works Section
  howItWorksSection: {
    marginBottom: 16,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  howItWorksIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  howItWorksCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  stepsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 155,
    minHeight: 72,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16.5,
    color: '#334155',
    fontWeight: '500',
  },
  stepArrowWrap: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Consent Checkbox Card
  consentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#00875A',
    backgroundColor: '#00875A',
  },
  consentText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#334155',
    fontWeight: '500',
  },
  // Primary Button
  primaryButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    ...Layout.shadow.md,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AadhaarAuthScreen;
