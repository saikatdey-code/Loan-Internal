/**
 * ApplicationLoginScreen — Login with Application Number flow
 * Matches Image 2 & Image 3:
 * - Step 1: Enter Application Number -> Send OTP
 * - Step 2: Enter 6-digit OTP -> Verify OTP -> Redirect to Dashboard/Home
 */
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

import {useToast} from '../../components';
import {AuthHeader, OtpInputBoxes, WatermarkBackground} from '../../components/auth';
import {Colors} from '../../constants/colors';
import {Typography} from '../../constants/typography';
import {Layout} from '../../constants/layout';
import {applicantLogin, verifyOtp, resendOtp} from '../../api';
import {encryptAes256Cbc, decryptAes256Cbc} from '../../utils/crypto';
import {setToken, setUserProfile} from '../../services/storage';

export type ApplicationLoginStep = 'APPLICATION_ID' | 'OTP';

interface ApplicationLoginScreenProps {
  onSuccess: () => void;
  onChooseAnotherMethod: () => void;
  onBack?: () => void;
}

type ScrollViewInstance = React.ElementRef<typeof ScrollView>;

const RESEND_INTERVAL = 60; // 60 seconds countdown

const ApplicationLoginScreen: React.FC<ApplicationLoginScreenProps> = ({
  onSuccess,
  onChooseAnotherMethod,
  onBack,
}) => {
  const toast = useToast();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const [step, setStep] = useState<ApplicationLoginStep>('APPLICATION_ID');
  const [applicationId, setApplicationId] = useState('');
  const [applicationIdError, setApplicationIdError] = useState('');
  const [otp, setOtp] = useState('');
  const [resolvedPhone, setResolvedPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(RESEND_INTERVAL);
  const [canResend, setCanResend] = useState(false);

  // Track keyboard state for smooth scrolling on Android
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Countdown Timer ──────────────────────────────────────────
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

  // ─── Helper: Decrypt / Format Phone ───────────────────────────
  const extractPhone = (rawPhone?: string): string => {
    if (!rawPhone) {
      return '';
    }
    try {
      if (rawPhone.includes(':')) {
        const decrypted = decryptAes256Cbc(rawPhone);
        return decrypted || rawPhone;
      }
      return rawPhone;
    } catch {
      return rawPhone;
    }
  };

  // ─── Step 1: Send OTP ─────────────────────────────────────────
  const handleSendOtp = async () => {
    const cleanAppId = applicationId.trim();
    if (!cleanAppId) {
      const msg = 'Please enter your application number';
      setApplicationIdError(msg);
      toast.error(msg);
      return;
    }

    setApplicationIdError('');
    setIsLoading(true);

    try {
      const response = await applicantLogin({applicationId: cleanAppId, isDraft: true});

      if (response && (response.success === true || response.status === true)) {
        toast.success(response.message || 'Otp send successfully');

        const phone = extractPhone(response.data?.phone);
        setResolvedPhone(phone);

        if (__DEV__ && response.otp) {
          console.log(
            `[AUTH] Development OTP for Application ${cleanAppId}:`,
            response.otp,
          );
        }

        setOtp('');
        setStep('OTP');
        startTimer();
      } else {
        const errorMsg =
          response?.message || 'Invalid application number. Please try again.';
        setApplicationIdError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Unable to send OTP. Please check your application number.';
      setApplicationIdError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2: Resend OTP ───────────────────────────────────────
  const handleResendOtp = async () => {
    if (!canResend || isResending) {
      return;
    }

    setIsResending(true);
    const cleanAppId = applicationId.trim();

    try {
      // If we have resolved phone number, call resendOtp, else applicantLogin
      let response;
      if (resolvedPhone) {
        response = await resendOtp({phone: resolvedPhone});
      } else {
        response = await applicantLogin({applicationId: cleanAppId, isDraft: true});
      }

      if (response && (response.status === true || response.success === true)) {
        toast.success(response.message || 'OTP resend successfully');

        if (__DEV__ && response.otp) {
          console.log(
            `[AUTH] Development Resent OTP for ${cleanAppId}:`,
            response.otp,
          );
        }

        setOtp('');
        startTimer();
      } else {
        toast.error(response?.message || 'Failed to resend OTP.');
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

  // ─── Step 2: Verify OTP ───────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.warning('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsVerifying(true);

    try {
      const encryptedData = encryptAes256Cbc({
        phone: resolvedPhone,
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
        onSuccess();
      } else {
        const errorMsg =
          response?.message || 'Verification failed. Please check your OTP.';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Verification failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── Header Back Navigation ───────────────────────────────────
  const handleBack = () => {
    if (step === 'OTP') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setStep('APPLICATION_ID');
    } else {
      if (onBack) {
        onBack();
      } else {
        onChooseAnotherMethod();
      }
    }
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
        <AuthHeader showBack={true} onBack={handleBack} />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            isKeyboardVisible && styles.scrollContentWithKeyboard,
            {
              paddingBottom: isKeyboardVisible
                ? (Platform.OS === 'android' ? 140 : 60)
                : Layout.spacing['2xl'],
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={true}
          overScrollMode="always">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.scrollInner}>
          {/* ════════════════════════════════════════════════════════
              STEP 1: LOGIN WITH APPLICATION NUMBER
             ════════════════════════════════════════════════════════ */}
          {step === 'APPLICATION_ID' && (
            <View style={styles.stepContainer}>
              {/* Top Avatar Badge (Document Icon) */}
              <View style={styles.topAvatarContainer}>
                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                    stroke={Colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M14 2V8H20"
                    stroke={Colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M8 12H16M8 16H14"
                    stroke={Colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.title}>Login with Application Number</Text>
              <Text style={styles.subtitle}>
                Enter your application number to receive an OTP
              </Text>

              {/* Subtle Divider */}
              <View style={styles.divider} />

              {/* Input Label & Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Application Number</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    Boolean(applicationIdError) && styles.textInputError,
                  ]}
                  placeholder="Enter your application number"
                  placeholderTextColor="#94A3B8"
                  value={applicationId}
                  onChangeText={val => {
                    setApplicationId(val);
                    if (applicationIdError) {
                      setApplicationIdError('');
                    }
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {Boolean(applicationIdError) && (
                  <Text style={styles.errorText}>{applicationIdError}</Text>
                )}
              </View>

              {/* Security / Notice Box */}
              <View style={styles.noticeCard}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                    stroke={Colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 12L11 14L15 10"
                    stroke={Colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.noticeText}>
                  An OTP will be sent to your registered mobile number linked
                  with your application
                </Text>
              </View>

              {/* Action Button: Send OTP */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!applicationId.trim() || isLoading) &&
                    styles.primaryButtonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={isLoading || !applicationId.trim()}
                activeOpacity={0.85}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M9 18L15 12L9 6"
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
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              {/* Secondary Button: Choose another login method */}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={onChooseAnotherMethod}
                activeOpacity={0.85}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                    stroke="#0284C7"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M14 2V8H20"
                    stroke="#0284C7"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M8 12H16M8 16H14"
                    stroke="#0284C7"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={styles.outlineButtonText}>
                  Choose another login method
                </Text>
              </TouchableOpacity>

              {/* Privacy Footer */}
              <View style={styles.footerNote}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    stroke="#64748B"
                    strokeWidth={2}
                  />
                  <Path
                    d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={styles.footerText}>
                  Your information is safe with us. We follow strict security
                  and privacy standards.
                </Text>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════
              STEP 2: ENTER OTP
             ════════════════════════════════════════════════════════ */}
          {step === 'OTP' && (
            <View style={styles.stepContainer}>
              {/* Top Avatar Badge (Shield Check Icon) */}
              <View style={styles.topAvatarContainer}>
                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                    stroke={Colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 12L11 14L15 10"
                    stroke={Colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>

              {/* Title & Phone Subtitle */}
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>
                Enter the OTP sent to{' '}
                <Text style={styles.phoneHighlight}>
                  {resolvedPhone || 'your registered number'}
                </Text>
              </Text>

              {/* 6 Digit OTP Input Boxes */}
              <OtpInputBoxes
                length={6}
                value={otp}
                onChangeOtp={setOtp}
                autoFocus={true}
              />

              {/* Resend OTP in Countdown */}
              <View style={styles.countdownRow}>
                {canResend ? (
                  <TouchableOpacity
                    style={styles.resendActiveButton}
                    onPress={handleResendOtp}
                    disabled={isResending}>
                    {isResending ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Text style={styles.resendActiveText}>Resend OTP</Text>
                        <Svg
                          width={15}
                          height={15}
                          viewBox="0 0 24 24"
                          fill="none">
                          <Path
                            d="M21 2V6M21 6H17M21 6L17.5 2.5C15.8 0.8 13.8 0 11.5 0C4.87 0 -0.5 5.37 -0.5 12C-0.5 18.63 4.87 24 11.5 24C17.03 24 21.68 20.25 23.09 15.1"
                            stroke={Colors.primary}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.countdownText}>
                    Resend OTP in{' '}
                    <Text style={styles.timerHighlight}>{formattedTimer}</Text>
                  </Text>
                )}
              </View>

              {/* Primary Action Button: Verify OTP */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (otp.length < 6 || isVerifying) &&
                    styles.primaryButtonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={otp.length < 6 || isVerifying}
                activeOpacity={0.85}>
                {isVerifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              {/* Secondary Actions: Resend & Wrong Application Number */}
              <View style={styles.otpActionsContainer}>
                {/* Resend Link below verify button */}
                <TouchableOpacity
                  style={styles.resendOtpRow}
                  onPress={handleResendOtp}
                  disabled={!canResend || isResending}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.resendOtpText,
                      !canResend && styles.resendOtpTextDisabled,
                    ]}>
                    Resend OTP
                  </Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M21 2V6M21 6H17M21 6L17.5 2.5C15.8 0.8 13.8 0 11.5 0C4.87 0 -0.5 5.37 -0.5 12C-0.5 18.63 4.87 24 11.5 24C17.03 24 21.68 20.25 23.09 15.1"
                      stroke={canResend ? Colors.primary : '#94A3B8'}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>

                {/* Wrong Application Number? Go Back */}
                <View style={styles.wrongNumberRow}>
                  <Text style={styles.wrongNumberText}>
                    Wrong application number?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (timerRef.current) {
                        clearInterval(timerRef.current);
                      }
                      setStep('APPLICATION_ID');
                    }}>
                    <Text style={styles.goBackLink}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
            </View>
          </TouchableWithoutFeedback>
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.xl,
    paddingBottom: Layout.spacing['2xl'],
    justifyContent: 'center',
  },
  scrollContentWithKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 36 : 20,
  },
  scrollInner: {
    width: '100%',
  },
  stepContainer: {
    width: '100%',
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
  inputGroup: {
    marginBottom: Layout.spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: '#0F172A',
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: 16,
    fontSize: Typography.fontSize.md,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
  },
  noticeCard: {
    backgroundColor: '#EBF7EE',
    borderRadius: Layout.borderRadius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: Layout.spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: '#065F46',
    lineHeight: 18,
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
    color: '#FFFFFF',
  },
  orRow: {
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
  },
  outlineButton: {
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1.2,
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: Layout.spacing.xl,
  },
  outlineButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: '#0284C7',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.md,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  phoneHighlight: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  countdownRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
  },
  countdownText: {
    fontSize: Typography.fontSize.sm,
    color: '#64748B',
  },
  timerHighlight: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  resendActiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendActiveText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },
  otpActionsContainer: {
    alignItems: 'center',
    marginTop: Layout.spacing.lg,
    gap: 12,
  },
  resendOtpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  resendOtpText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  resendOtpTextDisabled: {
    color: '#94A3B8',
  },
  wrongNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrongNumberText: {
    fontSize: Typography.fontSize.xs,
    color: '#64748B',
  },
  goBackLink: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});

export default ApplicationLoginScreen;
