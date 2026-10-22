/**
 * IneligibleApplicantModal — A beautiful, premium alert modal displayed when
 * DigiLocker Aadhaar verification returns status: false with "Applicant must be female".
 *
 * Features:
 * - Animated spring scale entrance and fade-in backdrop
 * - Multi-ringed emblem with WEmanipur accent color (#E84C6D) & sparkles
 * - Highlighted restriction callout displaying the API message
 * - Descriptive explanation of the Women Empowerment scheme eligibility
 * - UIDAI DigiLocker verification badge
 * - Primary "Go Back" action button with arrow icon
 */
import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import Svg, {Path, Circle, Polygon} from 'react-native-svg';
import {Colors} from '../constants/colors';

interface IneligibleApplicantModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  description?: string;
  onGoBack: () => void;
}

const IneligibleApplicantModal: React.FC<IneligibleApplicantModalProps> = ({
  visible,
  title = 'Eligibility Notice',
  message = 'Applicant must be female',
  description = 'The Women Empowerment Manipur (WEmanipur) scheme is designed exclusively for women applicants. As per the Aadhaar verification records retrieved via DigiLocker, this application cannot proceed.',
  onGoBack,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onGoBack}>
      <Pressable style={styles.backdrop} onPress={onGoBack}>
        <StatusBar barStyle="light-content" />

        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: opacityAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            {/* Top Close 'X' Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onGoBack}
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

            {/* Visual Icon Badge with Multi-layered Glow Rings */}
            <View style={styles.badgeContainer}>
              {/* Outer soft glow ring */}
              <View style={styles.glowRingOuter}>
                <View style={styles.glowRingInner}>
                  {/* Rose / Coral Accent Badge */}
                  <View style={styles.iconBadge}>
                    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                      {/* Female silhouette with alert badge */}
                      <Circle
                        cx="12"
                        cy="7"
                        r="4"
                        stroke="#FFFFFF"
                        strokeWidth={2.2}
                      />
                      <Path
                        d="M5.5 21C5.5 17.5 8.4 14.5 12 14.5C15.6 14.5 18.5 17.5 18.5 21"
                        stroke="#FFFFFF"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      />
                      <Circle cx="18" cy="6" r="4.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5} />
                      <Path
                        d="M18 4.5V6.5M18 8V8.2"
                        stroke="#FFFFFF"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                </View>
              </View>

              {/* Decorative Subtle Sparkles */}
              <View style={[styles.sparkle, styles.sparkleTopLeft]}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Polygon
                    points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9"
                    fill="#FDA4AF"
                  />
                </Svg>
              </View>
              <View style={[styles.sparkle, styles.sparkleTopRight]}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Polygon
                    points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9"
                    fill="#F59E0B"
                  />
                </Svg>
              </View>
              <View style={[styles.sparkle, styles.sparkleBottomLeft]}>
                <Svg width={10} height={10} viewBox="0 0 24 24">
                  <Circle cx="12" cy="12" r="6" fill="#F43F5E" />
                </Svg>
              </View>
              <View style={[styles.sparkle, styles.sparkleBottomRight]}>
                <Svg width={12} height={12} viewBox="0 0 24 24">
                  <Polygon
                    points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9"
                    fill="#E11D48"
                  />
                </Svg>
              </View>
            </View>

            {/* Scheme Tag */}
            <View style={styles.tagWrap}>
              <Text style={styles.tagText}>WOMEN EMPOWERMENT SCHEME</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Highlighted Restriction Callout Box */}
            <View style={styles.calloutCard}>
              <View style={styles.calloutIconWrap}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" fill="#FEE2E2" />
                  <Path
                    d="M12 8V12M12 16H12.01"
                    stroke="#DC2626"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.calloutText}>{message}</Text>
            </View>

            {/* Detailed Description */}
            <Text style={styles.description}>{description}</Text>

            {/* DigiLocker Verified Info Chip */}
            <View style={styles.digilockerChip}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                  fill="#F1F5F9"
                  stroke="#64748B"
                  strokeWidth={1.8}
                />
                <Path
                  d="M9 12L11 14L15 10"
                  stroke="#059669"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.digilockerChipText}>
                Verified via UIDAI DigiLocker
              </Text>
            </View>

            {/* Primary Action Button: Go Back */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onGoBack}
              activeOpacity={0.85}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.primaryButtonText}>Go Back</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.95)',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  glowRingOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRingInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.accent || '#E84C6D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleTopLeft: {
    top: 0,
    left: -4,
  },
  sparkleTopRight: {
    top: 4,
    right: -6,
  },
  sparkleBottomLeft: {
    bottom: 6,
    left: 2,
  },
  sparkleBottomRight: {
    bottom: -2,
    right: 4,
  },
  tagWrap: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E11D48',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  calloutCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FECDD3',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 14,
  },
  calloutIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#9F1239',
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  digilockerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 20,
  },
  digilockerChipText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
  },
  primaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.primary || '#00875A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary || '#00875A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default IneligibleApplicantModal;
