/**
 * SubmissionSuccessModal — Standard & beautiful success modal for application submission.
 * Replaces the default system Alert popup with a polished, Manipur-branded design.
 * Features:
 * - Animated modal overlay with spring scale entrance
 * - Emerald circular success badge with festive sparkles and checkmark
 * - Application ID card with tap-to-copy functionality
 * - Status pill with verification status note
 * - Primary "Go to Dashboard" action button
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Clipboard,
} from 'react-native';
import Svg, {Path, Circle, Rect, Polygon} from 'react-native-svg';

interface SubmissionSuccessModalProps {
  visible: boolean;
  applicationId?: string;
  title?: string;
  message?: string;
  onGoToDashboard: () => void;
  onClose?: () => void;
}

const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  visible,
  applicationId,
  title = 'Application Submitted Successfully!',
  message = 'Your application has been successfully submitted for verification. Tracking status is available on your dashboard.',
  onGoToDashboard,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCopied(false);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleCopy = () => {
    if (!applicationId) return;
    try {
      Clipboard.setString(applicationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Failed to copy to clipboard:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose || onGoToDashboard}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose || onGoToDashboard}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: opacityAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            {/* Top Close Button (if onClose provided) */}
            {onClose && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            )}

            {/* Success Illustration with Sparkles */}
            <View style={styles.badgeContainer}>
              {/* Outer soft glow ring */}
              <View style={styles.glowRingOuter}>
                <View style={styles.glowRingInner}>
                  {/* Emerald Badge */}
                  <View style={styles.emeraldBadge}>
                    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M20 6L9 17L4 12"
                        stroke="#FFFFFF"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                </View>
              </View>

              {/* Decorative Festive Sparkles */}
              <View style={[styles.sparkle, styles.sparkleTopLeft]}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="#F59E0B" />
                </Svg>
              </View>
              <View style={[styles.sparkle, styles.sparkleTopRight]}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="#10B981" />
                </Svg>
              </View>
              <View style={[styles.sparkle, styles.sparkleBottomLeft]}>
                <Svg width={10} height={10} viewBox="0 0 24 24">
                  <Circle cx="12" cy="12" r="8" fill="#3B82F6" />
                </Svg>
              </View>
              <View style={[styles.sparkle, styles.sparkleBottomRight]}>
                <Svg width={12} height={12} viewBox="0 0 24 24">
                  <Polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="#F59E0B" />
                </Svg>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Application ID Card (if provided) */}
            {applicationId ? (
              <View style={styles.appIdBox}>
                <View style={styles.appIdContent}>
                  <Text style={styles.appIdLabel}>APPLICATION NUMBER</Text>
                  <Text style={styles.appIdValue} numberOfLines={1} selectable>
                    {applicationId}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                  onPress={handleCopy}
                  activeOpacity={0.7}>
                  {copied ? (
                    <>
                      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M20 6L9 17L4 12"
                          stroke="#059669"
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                      <Text style={styles.copyTextSuccess}>Copied</Text>
                    </>
                  ) : (
                    <>
                      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                        <Rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          stroke="#00875A"
                          strokeWidth={1.8}
                        />
                        <Path
                          d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
                          stroke="#00875A"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                        />
                      </Svg>
                      <Text style={styles.copyText}>Copy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Explanatory Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Status Information Pill */}
            <View style={styles.statusPill}>
              <View style={styles.statusIconWrap}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    fill="#DCFCE7"
                    stroke="#00875A"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M12 6V12L16 14"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.statusPillText}>
                Under verification • Track status on Dashboard
              </Text>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onGoToDashboard}
              activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12H19M19 12L12 5M19 12L12 19"
                  stroke="#FFFFFF"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -16,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative',
    width: 104,
    height: 104,
    alignSelf: 'center',
  },
  glowRingOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRingInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emeraldBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00875A',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleTopLeft: {
    top: 4,
    left: 4,
  },
  sparkleTopRight: {
    top: 0,
    right: 2,
  },
  sparkleBottomLeft: {
    bottom: 8,
    left: 8,
  },
  sparkleBottomRight: {
    bottom: 4,
    right: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  appIdBox: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  appIdContent: {
    flex: 1,
    marginRight: 10,
  },
  appIdLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  appIdValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00875A',
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  copyBtnSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  copyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00875A',
  },
  copyTextSuccess: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  message: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 20,
    gap: 8,
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  statusIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00875A',
    flexShrink: 1,
  },
  primaryButton: {
    width: '100%',
    alignSelf: 'stretch',
    height: 50,
    backgroundColor: '#00875A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00875A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default SubmissionSuccessModal;
