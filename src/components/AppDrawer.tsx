/**
 * AppDrawer — Drawer navigation panel matching the WEmanipur UI design.
 * Features:
 * - Slide-in panel from left with smooth animated transition
 * - WEmanipur brand header with close (✕) button
 * - User profile card: "Signed in as [User Name] · Applicant Portal"
 * - Navigation links: Dashboard (active), Notification
 * - "Need assistance?" support card with 1800 number, email, hours & "Get Help →"
 * - Dev / Temp Tool: Delete User via POST /api/user/frontend-delete with Bearer Auth Token
 * - "Sign Out" button at the bottom
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Platform,
  Alert,
  Animated,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  PanResponder,
  Linking,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Logo, useToast, WatermarkBackground } from '../components';
import { deleteUser } from '../api';
import { getAssistanceData, AssistanceData } from '../api/assistance';
import {
  getToken,
  getUserProfile,
  clearAll,
  getStoredAssistanceData,
  setStoredAssistanceData,
} from '../services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  userName?: string;
}

const AppDrawer: React.FC<AppDrawerProps> = ({
  visible,
  onClose,
  navigation,
  userName = '',
}) => {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [deletePhone, setDeletePhone] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileName, setProfileName] = useState(userName);
  const [assistanceData, setAssistanceData] = useState<AssistanceData | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (visible) {
      translateX.setValue(-DRAWER_WIDTH);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();

      getUserProfile<any>()
        .then(profile => {
          if (profile?.name) {
            setProfileName(profile.name);
          }
          if (profile?.phone && !deletePhone) {
            setDeletePhone(profile.phone);
          }
        })
        .catch(() => { });

      getStoredAssistanceData<AssistanceData>()
        .then(cached => {
          if (cached) {
            setAssistanceData(cached);
          }
        })
        .catch(() => { });

      getAssistanceData()
        .then(res => {
          if (res?.success && res.data) {
            setAssistanceData(res.data);
            setStoredAssistanceData(res.data);
          }
        })
        .catch(() => { });
    } else {
      translateX.setValue(-DRAWER_WIDTH);
    }
  }, [visible, translateX]);

  const assistancePhone = assistanceData?.phone || '1800-XXX-XXXX';
  const assistanceEmail = assistanceData?.email || 'support@wemanipur.gov.in';
  const assistanceTiming =
    assistanceData?.timing || 'Mon - Sat, 9:00 AM to 6:00 PM';

  const handleCallAssistance = () => {
    const cleanPhone = assistancePhone.replace(/[^0-9+]/g, '');
    if (cleanPhone) {
      Linking.openURL(`tel:${cleanPhone}`).catch(() => { });
    }
  };

  const handleEmailAssistance = () => {
    if (assistanceEmail) {
      Linking.openURL(`mailto:${assistanceEmail}`).catch(() => { });
    }
  };

  const handleClose = () => {
    Animated.timing(translateX, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          handleClose();
          await clearAll();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        },
      },
    ]);
  };

  const handleNavigate = (screenName: string) => {
    handleClose();
    if (screenName === 'Dashboard') {
      navigation.navigate('Home');
    } else if (screenName === 'Notification') {
      navigation.navigate('Notification' as any);
    }
  };

  const performDelete = async (phone: string) => {
    setIsDeleting(true);
    try {
      const token = await getToken();
      const response = await deleteUser({
        phone,
        token: token || undefined,
      });

      if (response && response.success === false) {
        const msg = response.message || 'Failed to delete user';
        toast.error(msg);
        Alert.alert('Delete Failed', msg);
      } else {
        const successMsg = response?.message || 'User deleted successfully';
        toast.success(successMsg);
        setDeletePhone('');
        Keyboard.dismiss();

        Alert.alert(
          'User Deleted',
          `${successMsg}\n\nToken was passed with request.\nWould you like to sign out now?`,
          [
            { text: 'Stay on Dashboard', style: 'cancel' },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                handleClose();
                await clearAll();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Onboarding' }],
                });
              },
            },
          ],
        );
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete user. Please try again.';
      toast.error(errMsg);
      Alert.alert('Error', errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUser = () => {
    const cleaned = deletePhone.trim().replace(/\D/g, '');
    if (!cleaned) {
      toast.error('Please enter a mobile number to delete');
      Alert.alert('Validation Error', 'Please enter a mobile number to delete.');
      return;
    }
    if (cleaned.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      Alert.alert(
        'Validation Error',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete user with phone number +91 ${cleaned}?\n\nThis will call POST /api/user/frontend-delete passing the authentication token.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(cleaned),
        },
      ],
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Intercept when swiping horizontally left
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
        const isSwipingLeft = gestureState.dx < -6;
        return isHorizontal && isSwipingLeft;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        // Intercept from buttons / scroll if dragged left by at least 10px
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const isDraggingLeft = gestureState.dx < -10;
        return isHorizontal && isDraggingLeft;
      },
      onPanResponderMove: (_evt, gestureState) => {
        let newX = gestureState.dx;
        if (newX > 0) {
          // slight resistance when dragging right past boundary
          newX = Math.min(newX * 0.1, 10);
        } else {
          newX = Math.max(-DRAWER_WIDTH, newX);
        }
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, vx } = gestureState;
        // If dragged left by > 20% of width (approx 65px) or swiped left quickly
        if (dx < -DRAWER_WIDTH * 0.2 || vx < -0.4) {
          Animated.timing(translateX, {
            toValue: -DRAWER_WIDTH,
            duration: Math.max(100, 200 * (1 - Math.abs(dx) / DRAWER_WIDTH)),
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          // Spring back open
          Animated.spring(translateX, {
            toValue: 0,
            bounciness: 2,
            speed: 18,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          bounciness: 2,
          speed: 18,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const backdropOpacity = translateX.interpolate({
    inputRange: [-DRAWER_WIDTH, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        {/* Animated backdrop overlay */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Slide-in drawer container with drag & slide gesture support */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.drawerContainer,
            { transform: [{ translateX }] },
          ]}>
          {/* Official Manipur Kangla Sha Watermark */}
          <WatermarkBackground
            opacity={0.06}
            size={DRAWER_WIDTH * 0.78}
            offsetY={40}
          />

          {/* Header Row: Logo & Close Button */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoWrapper}>
              <Logo size="small" showSubtitle={false} />
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#334155"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.drawerScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* User Profile Card */}
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                    stroke="#00875A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                  <Circle cx="12" cy="7" r="4" stroke="#00875A" strokeWidth={1.8} />
                </Svg>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.signedInLabel}>Signed in as</Text>
                <Text style={styles.userName}>{profileName}</Text>
                <Text style={styles.portalTag}>Applicant Portal</Text>
              </View>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 18L15 12L9 6"
                  stroke="#00875A"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            {/* Navigation Links */}
            <View style={styles.navSection}>
              {/* Dashboard (Active) */}
              <TouchableOpacity
                style={[styles.navItem, styles.navItemActive]}
                onPress={() => handleNavigate('Dashboard')}
                activeOpacity={0.75}>
                <View style={styles.navItemLeft}>
                  {/* 4-squares grid icon */}
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="3"
                      y="3"
                      width="7"
                      height="7"
                      rx="1.5"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Rect
                      x="14"
                      y="3"
                      width="7"
                      height="7"
                      rx="1.5"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Rect
                      x="14"
                      y="14"
                      width="7"
                      height="7"
                      rx="1.5"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                    <Rect
                      x="3"
                      y="14"
                      width="7"
                      height="7"
                      rx="1.5"
                      stroke="#00875A"
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.navTextActive}>Dashboard</Text>
                </View>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18L15 12L9 6"
                    stroke="#00875A"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>

              {/* Notification */}
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => handleNavigate('Notification')}
                activeOpacity={0.75}>
                <View style={styles.navItemLeft}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
                      stroke="#64748B"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
                      stroke="#64748B"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.navText}>Notification</Text>
                </View>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18L15 12L9 6"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Need assistance? Card */}
            <View style={styles.supportCard}>
              <View style={styles.supportHeader}>
                <View style={styles.supportIcon}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M3 18V12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12V18"
                      stroke="#00875A"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                    <Rect
                      x="2"
                      y="14"
                      width="4"
                      height="7"
                      rx="2"
                      fill="#D1FAE5"
                      stroke="#00875A"
                      strokeWidth={1.5}
                    />
                    <Rect
                      x="18"
                      y="14"
                      width="4"
                      height="7"
                      rx="2"
                      fill="#D1FAE5"
                      stroke="#00875A"
                      strokeWidth={1.5}
                    />
                  </Svg>
                </View>
                <View style={styles.supportTitleWrapper}>
                  <Text style={styles.supportTitle}>Need assistance?</Text>
                  <Text style={styles.supportSub}>Our support team is available.</Text>
                </View>
              </View>

              <View style={styles.supportDetails}>
                <TouchableOpacity
                  style={styles.supportRow}
                  onPress={handleCallAssistance}
                  activeOpacity={0.7}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M22 16.92V19.92C22 20.48 21.54 20.94 20.98 20.92C10.5 20.38 2.08 11.96 1.54 1.48C1.52 0.92 1.98 0.46 2.54 0.46H5.54C6.04 0.46 6.46 0.84 6.52 1.34C6.64 2.34 6.88 3.32 7.24 4.24C7.38 4.6 7.28 5.02 6.98 5.28L5.5 6.76C7.2 10.14 9.94 12.88 13.32 14.58L14.8 13.1C15.06 12.8 15.48 12.7 15.84 12.84C16.76 13.2 17.74 13.44 18.74 13.56C19.24 13.62 19.62 14.04 19.62 14.54V17.54"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                  </Svg>
                  <Text style={styles.supportText}>{assistancePhone}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.supportRow}
                  onPress={handleEmailAssistance}
                  activeOpacity={0.7}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="2"
                      y="4"
                      width="20"
                      height="16"
                      rx="3"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M2 7L12 13L22 7"
                      stroke="#00875A"
                      strokeWidth={1.8}
                    />
                  </Svg>
                  <Text style={styles.supportText}>{assistanceEmail}</Text>
                </TouchableOpacity>

                <View style={styles.supportRow}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" stroke="#00875A" strokeWidth={1.8} />
                    <Path d="M12 6V12L16 14" stroke="#00875A" strokeWidth={1.8} />
                  </Svg>
                  <Text style={styles.supportText}>{assistanceTiming}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.getHelpLink}
                onPress={() => {
                  handleClose();
                  navigation.navigate('Help');
                }}
                activeOpacity={0.7}>
                <Text style={styles.getHelpText}>Get Help</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="#00875A"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Temporary Dev Tool: Delete User (Commented out) */}

            <View style={styles.tempSection}>
              <View style={styles.tempHeader}>
                <Text style={styles.tempBadge}>⚠️ DEV / TEMP TOOL</Text>
                <Text style={styles.tempApiText}>POST api/user/frontend-delete</Text>
              </View>
              <View style={styles.tempTokenNotice}>
                <Text style={styles.tempTokenNoticeText}>
                  🔒 Auth Bearer Token will be passed with request
                </Text>
              </View>
              <View style={styles.tempInputRow}>
                <View style={styles.tempInputWrapper}>
                  <Text style={styles.tempCountryPrefix}>+91</Text>
                  <TextInput
                    style={styles.tempInput}
                    placeholder="Mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={deletePhone}
                    onChangeText={text => setDeletePhone(text.replace(/\D/g, ''))}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.tempDeleteButton,
                    (!deletePhone.trim() || isDeleting) &&
                    styles.tempDeleteButtonDisabled,
                  ]}
                  onPress={handleDeleteUser}
                  disabled={!deletePhone.trim() || isDeleting}
                  activeOpacity={0.7}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.tempDeleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>



            {/* Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.75}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                  stroke="#334155"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Path
                  d="M16 17L21 12L16 7"
                  stroke="#334155"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M21 12H9"
                  stroke="#334155"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: 'transparent',
  },
  logoWrapper: {
    alignItems: 'center',
    flex: 1,
    paddingLeft: 20,
  },
  closeButton: {
    padding: 6,
  },
  drawerScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawerScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF8F3',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  signedInLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  portalTag: {
    fontSize: 11,
    color: '#64748B',
  },
  navSection: {
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  navItemActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#B6E3CB',
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  navTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00875A',
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 16,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  supportIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitleWrapper: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  supportSub: {
    fontSize: 10.5,
    color: '#64748B',
  },
  supportDetails: {
    gap: 6,
    marginBottom: 8,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportText: {
    fontSize: 11,
    color: '#475569',
  },
  getHelpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  getHelpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
  },
  // Temporary Dev Section
  tempSection: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  tempHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tempBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  tempApiText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#64748B',
  },
  tempTokenNotice: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  tempTokenNoticeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#B91C1C',
  },
  tempInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tempInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  tempCountryPrefix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginRight: 4,
  },
  tempInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  tempDeleteButton: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  tempDeleteButtonDisabled: {
    backgroundColor: '#FCA5A5',
    opacity: 0.7,
  },
  tempDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 44,
  },
  signOutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
});

export default AppDrawer;
