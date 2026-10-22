/**
 * MobileVerificationScreen — Mobile Verification step matching the WEmanipur UI design.
 * Steps:
 * 1. Mobile Number Input + "Send OTP" -> Calls POST http://localhost:3000/api/send-phone-otp
 * 2. 6-Digit OTP Verification + Timer -> Calls POST http://localhost:3000/api/verify-otp
 * 3. On Success -> Navigates to PersonalInfoScreen with verified mobile number pre-filled!
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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle} from 'react-native-svg';

import {Logo, useToast} from '../../components';
import {
  AuthHeader,
  PhoneInputField,
  OtpInputBoxes,
  SecurityNoticeCard,
  SecurityFooter,
  LandscapeFooter,
  WatermarkBackground,
} from '../../components/auth';
import {Colors} from '../../constants/colors';
import {Layout} from '../../constants/layout';
import {sendPhoneOtp, verifyOtp, resendOtp} from '../../api';
import {encryptAes256Cbc} from '../../utils/crypto';
import {setToken, setUserProfile, getLoanId} from '../../services/storage';
import type {RootStackScreenProps} from '../../types/navigation';

type Props = RootStackScreenProps<'MobileVerification'>;

const RESEND_INTERVAL = 120;

const MobileVerificationScreen: React.FC<Props> = ({navigation, route}) => {
  const toast = useToast();
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState(route.params?.phone || '');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(RESEND_INTERVAL);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleBack = useCallback(() => {
    if (step === 'OTP') {
      setStep('PHONE');
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  // ─── Step 1: Send OTP ─────────────────────────────────────────
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
      console.log(`[MobileVerificationScreen] Sending OTP to: ${cleanPhone}`);
      const response = await sendPhoneOtp({phone: cleanPhone});

      if (response && (response.success !== false && response.status !== false)) {
        toast.success(response.message || 'OTP sent successfully');
        if (__DEV__ && response.otp) {
          console.log(`[AUTH] Development OTP for ${cleanPhone}:`, response.otp);
        }
        setOtp('');
        setStep('OTP');
        startTimer();
      } else {
        const errorMsg =
          response?.message || 'Failed to send OTP. Please try again.';
        setPhoneError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.warn('[MobileVerificationScreen] sendPhoneOtp error:', error);
      if (__DEV__) {
        toast.info('Sending test OTP (Development Mode)...');
        setOtp('');
        setStep('OTP');
        startTimer();
      } else {
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          'Unable to connect to server. Please try again.';
        setPhoneError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2: Resend OTP ───────────────────────────────────────
  const handleResendOtp = async () => {
    if (!canResend || isResending) return;

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    setIsResending(true);

    try {
      const response = await resendOtp({phone: cleanPhone});
      if (response && (response.status === true || response.success === true)) {
        toast.success(response.message || 'OTP resent successfully');
        setOtp('');
        startTimer();
      } else {
        toast.error(response?.message || 'Failed to resend OTP.');
      }
    } catch (error: any) {
      toast.error('Unable to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // ─── Step 3: Verify OTP ───────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.warning('Please enter the complete 6-digit OTP.');
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    setIsLoading(true);

    try {
      // AES-256-CBC Encrypted Payload
      const encryptedData = encryptAes256Cbc({
        phone: cleanPhone,
        otp: Number(otp),
      });

      console.log(`[MobileVerificationScreen] Verifying OTP: ${encryptedData}`);
      const response = await verifyOtp({data: encryptedData});

      if (response && (response.status !== false && response.success !== false)) {
        if (response.data?.token) {
          await setToken(response.data.token);
        }
        if (response.data?.userDetails) {
          await setUserProfile(response.data.userDetails);
        }

        toast.success(response.message || 'Mobile number verified successfully!');

        const storedId = await getLoanId();
        const activeLoanId =
          route.params?.loanId || storedId || '961701b5-47bb-4050-9d12-8e553159953e';

        // Proceed to Personal Information screen!
        navigation.navigate('PersonalInfo', {
          loanId: activeLoanId,
          applicationNumber: route.params?.applicationNumber,
          verifiedPhone: cleanPhone,
        });
      } else {
        const errorMsg =
          response?.message || 'Verification failed. Invalid OTP.';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.warn('[MobileVerificationScreen] verifyOtp error:', error);
      if (__DEV__) {
        toast.success('Mobile number verified successfully (Dev Mode)!');
        const storedId = await getLoanId();
        const activeLoanId =
          route.params?.loanId || storedId || '961701b5-47bb-4050-9d12-8e553159953e';
        navigation.navigate('PersonalInfo', {
          loanId: activeLoanId,
          applicationNumber: route.params?.applicationNumber,
          verifiedPhone: cleanPhone,
        });
      } else {
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          'Verification failed. Please try again.';
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayPhone = (num: string) => {
    if (!num) return '';
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

      {/* Top Header with Back & Skip */}
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

        {/* Right Spacer to keep Logo centered */}
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Banner Card */}
          <View style={styles.bannerCard}>
            <View style={styles.avatarBadge}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M22 16.92V19.92C22 20.48 21.54 20.94 20.98 20.92C10.5 20.38 2.08 11.96 1.54 1.48C1.52 0.92 1.98 0.46 2.54 0.46H5.54C6.04 0.46 6.46 0.84 6.52 1.34C6.64 2.34 6.88 3.32 7.24 4.24C7.38 4.6 7.28 5.02 6.98 5.28L5.5 6.76C7.2 10.14 9.94 12.88 13.32 14.58L14.8 13.1C15.06 12.8 15.48 12.7 15.84 12.84C16.76 13.2 17.74 13.44 18.74 13.56C19.24 13.62 19.62 14.04 19.62 14.54V17.54"
                  stroke="#00875A"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.bannerTextWrapper}>
              <Text style={styles.bannerTitle}>Verify Mobile Number</Text>
              <Text style={styles.bannerSubtitle}>
                Verify your mobile number before proceeding to personal information.
              </Text>
            </View>
          </View>

          {step === 'PHONE' ? (
            <View style={styles.stepContainer}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Mobile Verification</Text>
                <Text style={styles.subtitle}>
                  Enter your 10-digit mobile number to verify and receive OTP.
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  Mobile Number <Text style={styles.redAsterisk}>*</Text>
                </Text>
                <PhoneInputField
                  value={phoneNumber}
                  onChangeText={val => {
                    setPhoneNumber(val);
                    if (phoneError) setPhoneError('');
                  }}
                  error={phoneError}
                />
              </View>

              <SecurityNoticeCard
                message="We will send an OTP to your mobile number. Next, you will fill your Personal Information."
                style={styles.noticeSpacing}
              />

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

              <SecurityFooter style={styles.footerNote} />
            </View>
          ) : (
            <View style={styles.stepContainer}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Enter Verification OTP</Text>
                <Text style={styles.subtitle}>
                  We have sent a 6-digit OTP code to{'\n'}
                  <Text style={styles.phoneHighlight}>
                    +91 {formatDisplayPhone(phoneNumber)}
                  </Text>
                </Text>
              </View>

              <OtpInputBoxes
                length={6}
                value={otp}
                onChangeOtp={setOtp}
                autoFocus={true}
              />

              <View style={styles.resendContainer}>
                <Text style={styles.resendNormalText}>
                  Didn't receive the OTP?{' '}
                </Text>
                {isResending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : canResend ? (
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={styles.resendActionText}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendCountdownText}>
                    Resend in <Text style={styles.timerColor}>{formattedTimer}</Text>
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (otp.length < 6 || isLoading) && styles.primaryButtonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={isLoading || otp.length < 6}
                activeOpacity={0.85}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
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

              <TouchableOpacity
                style={styles.changePhoneButton}
                onPress={() => setStep('PHONE')}
                activeOpacity={0.7}>
                <Text style={styles.changePhoneText}>Change Mobile Number</Text>
              </TouchableOpacity>

              <SecurityNoticeCard
                message="Your mobile number will be verified and pre-filled in your Personal Information."
                style={styles.noticeSpacing}
              />
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <LandscapeFooter height={120} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    minWidth: 70,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00875A',
  },
  centerLogo: {
    alignItems: 'center',
  },
  headerSpacer: {
    minWidth: 70,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.xl,
    paddingTop: Layout.spacing.md,
    paddingBottom: 110,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderRadius: Layout.borderRadius.xl,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerTextWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12.5,
    color: '#526071',
    lineHeight: 17,
  },
  stepContainer: {
    width: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  title: {
    fontSize: 24,
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
  phoneHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  inputSection: {
    marginBottom: Layout.spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  redAsterisk: {
    color: '#EF4444',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerNote: {
    marginTop: Layout.spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  resendNormalText: {
    fontSize: 13,
    color: '#64748B',
  },
  resendCountdownText: {
    fontSize: 13,
    color: '#64748B',
  },
  timerColor: {
    color: Colors.primary,
    fontWeight: '700',
  },
  resendActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  changePhoneButton: {
    alignSelf: 'center',
    paddingVertical: Layout.spacing.sm,
    marginTop: Layout.spacing.xs,
    marginBottom: Layout.spacing.sm,
  },
  changePhoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default MobileVerificationScreen;
