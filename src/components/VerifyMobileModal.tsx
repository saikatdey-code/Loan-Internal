/**
 * VerifyMobileModal — Reusable Modal component for dynamic mobile number OTP verification
 * Calls:
 * 1. POST http://localhost:3000/api/send-phone-otp { "phone": "..." }
 * 2. POST http://localhost:3000/api/verify-otp { "data": "<AES-256-CBC encrypted payload>" }
 */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Keyboard,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import Logo from './Logo';
import {useToast} from './Toast';
import {
  PhoneInputField,
  OtpInputBoxes,
  SecurityNoticeCard,
} from './auth';
import {Colors} from '../constants/colors';
import {Layout} from '../constants/layout';
import {sendPhoneOtp, verifyOtp, resendOtp} from '../api';
import {encryptAes256Cbc} from '../utils/crypto';
import {setToken, setUserProfile} from '../services/storage';

interface VerifyMobileModalProps {
  visible: boolean;
  initialPhone?: string;
  onClose: () => void;
  onSuccess: (verifiedPhone: string) => void;
}

const RESEND_INTERVAL = 120;

export const VerifyMobileModal: React.FC<VerifyMobileModalProps> = ({
  visible,
  initialPhone = '',
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(RESEND_INTERVAL);
  const [canResend, setCanResend] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone);
    }
  }, [initialPhone]);

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

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      const msg = 'Please enter a valid 10-digit mobile number';
      setPhoneError(msg);
      toast.error(msg);
      return;
    }

    setPhoneError('');
    setIsLoading(true);

    try {
      console.log(`[VerifyMobileModal] Sending OTP to: ${cleanPhone}`);
      const response = await sendPhoneOtp({phone: cleanPhone});

      if (response && (response.success !== false && response.status !== false)) {
        toast.success(response.message || 'OTP sent successfully');
        if (__DEV__ && response.otp) {
          console.log(`[AUTH] OTP for ${cleanPhone}:`, response.otp);
        }
        setOtp('');
        setStep('OTP');
        startTimer();
      } else {
        const errorMsg = response?.message || 'Failed to send OTP. Please try again.';
        setPhoneError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.warn('[VerifyMobileModal] sendPhoneOtp error:', error);
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

  const handleResendOtp = async () => {
    if (!canResend || isResending) {
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
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

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.warning('Please enter the complete 6-digit OTP.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    setIsLoading(true);

    try {
      // AES-256-CBC Encrypted Payload
      const encryptedData = encryptAes256Cbc({
        phone: cleanPhone,
        otp: Number(otp),
      });

      console.log(`[VerifyMobileModal] Verifying OTP with encrypted data: ${encryptedData}`);
      const response = await verifyOtp({data: encryptedData});

      if (response && (response.status !== false && response.success !== false)) {
        if (response.data?.token) {
          await setToken(response.data.token);
        }
        if (response.data?.userDetails) {
          await setUserProfile(response.data.userDetails);
        }

        toast.success(response.message || 'Mobile number verified successfully!');
        onSuccess(cleanPhone);
        onClose();
      } else {
        const errorMsg = response?.message || 'Verification failed. Invalid OTP.';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.warn('[VerifyMobileModal] verifyOtp error:', error);
      if (__DEV__) {
        toast.success('Mobile number verified successfully (Dev Mode)!');
        onSuccess(cleanPhone);
        onClose();
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={styles.modalContent}
            onPress={() => Keyboard.dismiss()}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <Logo size="small" showSubtitle={false} />
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag">
              {step === 'PHONE' ? (
                <View>
                  <Text style={styles.modalTitle}>Verify Mobile Number</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your 10-digit mobile number to receive a verification OTP code.
                  </Text>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>
                      Mobile Number <Text style={styles.redAsterisk}>*</Text>
                    </Text>
                    <PhoneInputField
                      value={phone}
                      onChangeText={val => {
                        setPhone(val);
                        if (phoneError) setPhoneError('');
                      }}
                      error={phoneError}
                    />
                  </View>

                  <SecurityNoticeCard
                    message="We will send a 6-digit OTP to verify your mobile number before entering personal details."
                    style={styles.noticeSpacing}
                  />

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (phone.length < 10 || isLoading) && styles.primaryButtonDisabled,
                    ]}
                    onPress={handleSendOtp}
                    disabled={isLoading || phone.length < 10}
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
                </View>
              ) : (
                <View>
                  <Text style={styles.modalTitle}>Enter Verification Code</Text>
                  <Text style={styles.modalSubtitle}>
                    We have sent a 6-digit OTP code to{' '}
                    <Text style={styles.phoneHighlight}>
                      +91 {formatDisplayPhone(phone)}
                    </Text>
                  </Text>

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
                </View>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.spacing.xl,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Layout.spacing['2xl'],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: Layout.spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: Layout.spacing.lg,
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
    marginTop: Layout.spacing.md,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Layout.spacing.md,
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
  },
  changePhoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});

export default VerifyMobileModal;
