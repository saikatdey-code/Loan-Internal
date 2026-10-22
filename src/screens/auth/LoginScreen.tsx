/**
 * LoginScreen — 4-Step Authentication Flow matching the WEmanipur UI design.
 * Steps:
 * 1. PHONE: Mobile Number Input + "Send OTP"
 * 2. OTP: 6-Digit OTP Verification + Resend Timer
 * 3. VERIFYING: Animated Circular Progress Ring
 * 4. SUCCESS: Animated Checkmark Badge + Dashboard Redirect
 */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Rect} from 'react-native-svg';

import {Logo, useToast} from '../../components';
import {
  AuthHeader,
  LandscapeFooter,
  SecurityNoticeCard,
  SecurityFooter,
  PhoneInputField,
  OtpInputBoxes,
  VerifyingSpinner,
  SuccessBadge,
  WatermarkBackground,
} from '../../components/auth';
import {Colors} from '../../constants/colors';
import {Typography} from '../../constants/typography';
import {Layout} from '../../constants/layout';
import {setToken, setUserProfile} from '../../services/storage';
import {applicantLogin, resendOtp, verifyOtp} from '../../api';
import {encryptAes256Cbc} from '../../utils/crypto';

export type LoginStep = 'PHONE' | 'OTP' | 'VERIFYING' | 'SUCCESS';

interface LoginScreenProps {
  onSuccess?: () => void;
  onBackToOnboarding?: () => void;
  onNavigateToApplicationLogin?: () => void;
  initialStep?: LoginStep;
}

const RESEND_INTERVAL = 120; // 2 minutes (120 seconds)

const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onBackToOnboarding,
  onNavigateToApplicationLogin,
  initialStep = 'PHONE',
}) => {
  const toast = useToast();
  const [step, setStep] = useState<LoginStep>(initialStep);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(RESEND_INTERVAL);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Countdown Timer for OTP Resend ───────────────────────
  const startTimer = useCallback(() => {
    setTimer(RESEND_INTERVAL);
    setCanResend(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleFinish = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);

  // ─── Auto-redirect on SUCCESS Step ────────────────────────
  useEffect(() => {
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null;
    if (step === 'SUCCESS') {
      redirectTimeout = setTimeout(() => {
        handleFinish();
      }, 3000);
    }
    return () => {
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [step, handleFinish]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleSendOtp = async () => {
    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      const msg = 'Please enter a valid 10-digit mobile number';
      setPhoneError(msg);
      toast.error(msg);
      return;
    }

    setPhoneError('');
    setIsLoading(true);

    try {
      const response = await applicantLogin({phone: cleanPhone});

      if (response && response.success) {
        toast.success(response.message || 'Otp send successfully');

        if (response.data?.phone) {
          setSessionPhone(response.data.phone);
        }

        if (__DEV__ && response.otp) {
          console.log(`[AUTH] Development OTP for ${cleanPhone}:`, response.otp);
        }

        setOtp('');
        setStep('OTP');
        startTimer();
      } else {
        const errorMsg =
          response?.message || 'No application found on this number';
        setPhoneError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Unable to connect to server. Please try again.';
      setPhoneError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isResending) {
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    setIsResending(true);

    try {
      const response = await resendOtp({phone: cleanPhone});

      if (response && (response.status === true || response.success === true)) {
        toast.success(response.message || 'OTP resend successfully');

        if (__DEV__ && response.otp) {
          console.log(`[AUTH] Resent OTP for ${cleanPhone}:`, response.otp);
        }

        setOtp('');
        startTimer();
      } else {
        const errorMsg =
          response?.message || 'Failed to resend OTP. Please try again.';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Unable to resend OTP. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.warning('Please enter the complete 6-digit OTP.');
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    setStep('VERIFYING');

    try {
      const encryptedData = encryptAes256Cbc({
        phone: cleanPhone,
        otp: Number(otp),
      });

      const response = await verifyOtp({data: encryptedData});

      if (response && (response.status === true || response.success === true)) {
        const token = response.data?.token;
        const userDetails = response.data?.userDetails;

        if (token) {
          await setToken(token);
        }
        if (userDetails) {
          await setUserProfile(userDetails);
        }

        toast.success(response.message || 'Account verified successfully');
        setStep('SUCCESS');
      } else {
        const errorMsg =
          response?.message || 'Verification failed. Please check your OTP.';
        toast.error(errorMsg);
        setStep('OTP');
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Verification failed. Please try again.';
      toast.error(errorMsg);
      setStep('OTP');
    }
  };

  const handleBack = () => {
    if (step === 'OTP') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setStep('PHONE');
    } else if (step === 'VERIFYING') {
      setStep('OTP');
    } else if (step === 'PHONE') {
      onBackToOnboarding?.();
    }
  };

  const formatDisplayPhone = (num: string) => {
    if (!num) {
      return '98765 43210';
    }
    if (num.length === 10) {
      return `${num.slice(0, 5)} ${num.slice(5)}`;
    }
    return num;
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const formattedTimer = `${minutes < 10 ? `0${minutes}` : minutes}:${
    seconds < 10 ? `0${seconds}` : seconds
  }`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Navigation Header */}
        <AuthHeader
          showBack={step !== 'SUCCESS'}
          onBack={handleBack}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Centered Brand Logo */}
          <View style={styles.logoSection}>
            <Logo size="small" showSubtitle={true} />
          </View>

          {/* ══════════════════════════════════════════════════════
              STEP 1: LOGIN WITH MOBILE NUMBER
             ══════════════════════════════════════════════════════ */}
          {step === 'PHONE' && (
            <View style={styles.stepContainer}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Login with Mobile Number</Text>
                <Text style={styles.subtitle}>
                  Enter your registered mobile number{'\n'}to continue.
                </Text>
              </View>

              {/* Phone Input Box */}
              <View style={styles.inputSection}>
                <PhoneInputField
                  value={phoneNumber}
                  onChangeText={val => {
                    setPhoneNumber(val);
                    if (phoneError) {
                      setPhoneError('');
                    }
                  }}
                  error={phoneError}
                  autoFocus={false}
                />
              </View>

              {/* Security Shield Card */}
              <SecurityNoticeCard
                message="We will send an OTP to your registered mobile number linked with your account."
                style={styles.noticeSpacing}
              />

              {/* Primary Action Button: Send OTP */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (phoneNumber.length < 10 || isLoading) &&
                    styles.primaryButtonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={isLoading || phoneNumber.length < 10}
                activeOpacity={0.85}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
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

              {/* "OR" Divider */}
              <View style={styles.orDividerContainer}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              {/* Secondary Button: Login with Application Number */}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => {
                  if (onNavigateToApplicationLogin) {
                    onNavigateToApplicationLogin();
                  } else {
                    Alert.alert(
                      'Application Login',
                      'Application Number login will be available soon.',
                    );
                  }
                }}
                activeOpacity={0.8}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="4"
                    y="3"
                    width="16"
                    height="18"
                    rx="2"
                    stroke="#0284C7"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M8 8H16M8 12H16M8 16H13"
                    stroke="#0284C7"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={styles.outlineButtonText}>
                  Login with Application Number
                </Text>
              </TouchableOpacity>

              {/* Security Footer Note */}
              <SecurityFooter style={styles.footerNote} />
            </View>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 2: ENTER OTP
             ══════════════════════════════════════════════════════ */}
          {step === 'OTP' && (
            <View style={styles.stepContainer}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                  We have sent a 6-digit OTP to{'\n'}
                  <Text style={styles.phoneHighlight}>
                    +91 {formatDisplayPhone(phoneNumber)}
                  </Text>
                </Text>
              </View>

              {/* 6 Digit Input Boxes */}
              <OtpInputBoxes
                length={6}
                value={otp}
                onChangeOtp={setOtp}
                autoFocus={true}
              />

              {/* Resend OTP Row */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendNormalText}>
                  Didn't receive the OTP?{' '}
                </Text>
                {isResending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : canResend ? (
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={isResending}>
                    <Text style={styles.resendActionText}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendCountdownText}>
                    Resend in <Text style={styles.timerColor}>{formattedTimer}</Text>
                  </Text>
                )}
              </View>

              {/* Primary Action Button: Verify OTP */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  otp.length < 6 && styles.primaryButtonDisabled,
                ]}
                onPress={handleVerifyOtp}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Verify OTP</Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="#FFFFFF"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>

              {/* Change Mobile Number Link */}
              <TouchableOpacity
                style={styles.changePhoneButton}
                onPress={() => setStep('PHONE')}
                activeOpacity={0.7}>
                <Text style={styles.changePhoneText}>Change Mobile Number</Text>
              </TouchableOpacity>

              {/* Security Shield Card */}
              <SecurityNoticeCard
                message="Your information is secure with us. We follow strict security and privacy standards."
                style={styles.noticeSpacing}
              />
            </View>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 3: VERIFYING OTP
             ══════════════════════════════════════════════════════ */}
          {step === 'VERIFYING' && (
            <View style={[styles.stepContainer, styles.centeredStepContainer]}>
              {/* Rotating Ring Spinner */}
              <VerifyingSpinner size={88} strokeWidth={7} />

              <Text style={styles.title}>Verifying OTP</Text>
              <Text style={[styles.subtitle, styles.centeredSubtitle]}>
                Please wait while we verify{'\n'}your mobile number.
              </Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 4: LOGIN SUCCESSFUL
             ══════════════════════════════════════════════════════ */}
          {step === 'SUCCESS' && (
            <View style={[styles.stepContainer, styles.centeredStepContainer]}>
              {/* Green Checkmark Badge with Radiating Rays */}
              <SuccessBadge size={120} />

              <Text style={styles.title}>Login Successful</Text>
              <Text style={styles.welcomeText}>Welcome to WEManipur</Text>
              <Text style={[styles.subtitle, styles.centeredSubtitle, styles.redirectSubtitle]}>
                You will be redirected to your dashboard{'\n'}in a few seconds...
              </Text>

              {/* Go to Dashboard CTA */}
              <TouchableOpacity
                style={[styles.primaryButton, styles.dashboardButton]}
                onPress={handleFinish}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="#FFFFFF"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          )}

          {/* Spacer for bottom landscape illustration */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Decorative Landscape Footer Illustration */}
        <LandscapeFooter height={130} />
      </KeyboardAvoidingView>
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
    paddingBottom: 120, // space above landscape
  },
  logoSection: {
    alignItems: 'center',
    marginTop: Layout.spacing.xs,
    marginBottom: Layout.spacing.lg,
  },
  stepContainer: {
    width: '100%',
  },
  centeredStepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Layout.spacing['2xl'],
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
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
  centeredSubtitle: {
    textAlign: 'center',
    marginTop: 10,
  },
  welcomeText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: '#1E293B',
    marginTop: 4,
  },
  redirectSubtitle: {
    color: '#94A3B8',
    fontSize: Typography.fontSize.xs,
    marginTop: 8,
  },
  phoneHighlight: {
    fontWeight: Typography.fontWeight.bold,
    color: '#0F172A',
  },
  inputSection: {
    marginBottom: Layout.spacing.md,
  },
  noticeSpacing: {
    marginVertical: Layout.spacing.md,
  },
  primaryButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Layout.spacing.sm,
    ...Layout.shadow.md,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  dashboardButton: {
    width: '100%',
    marginTop: Layout.spacing['3xl'],
  },
  orDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Layout.spacing.lg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    fontSize: Typography.fontSize.xs,
    color: '#94A3B8',
    fontWeight: Typography.fontWeight.semibold,
    marginHorizontal: Layout.spacing.md,
    letterSpacing: 0.5,
  },
  outlineButton: {
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1.2,
    borderColor: '#93C5FD',
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Layout.spacing.xl,
  },
  outlineButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: '#0284C7',
  },
  footerNote: {
    marginTop: Layout.spacing.sm,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  resendNormalText: {
    fontSize: Typography.fontSize.xs,
    color: '#64748B',
  },
  resendCountdownText: {
    fontSize: Typography.fontSize.xs,
    color: '#64748B',
  },
  timerColor: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  resendActionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  changePhoneButton: {
    alignSelf: 'center',
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    marginTop: Layout.spacing.xs,
    marginBottom: Layout.spacing.sm,
  },
  changePhoneText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default LoginScreen;
