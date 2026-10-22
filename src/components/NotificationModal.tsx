/**
 * NotificationModal — Full-screen / Sheet Modal for viewing notifications.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import NotificationComponent from './NotificationComponent';
import {NotificationItem} from '../api/notification';
import WatermarkBackground from './auth/WatermarkBackground';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNotificationPress?: (item: NotificationItem) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onNotificationPress,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 16);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <StatusBar barStyle="dark-content" />

        {/* Official Manipur Kangla Sha Watermark */}
        <WatermarkBackground opacity={0.06} />

        {/* Header Bar */}
        <View style={[styles.headerContainer, {paddingTop: topInset}]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#0F172A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            <View style={styles.titleWrap}>
              <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            {/* Spacer to balance close button */}
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Notifications Body */}
        <View style={styles.bodyContainer}>
          <NotificationComponent onNotificationPress={onNotificationPress} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 36,
  },
  bodyContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default NotificationModal;
