/**
 * NotificationScreen — Dedicated screen for viewing notifications.
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {Logo, NotificationComponent, WatermarkBackground} from '../components';
import type {RootStackScreenProps} from '../types/navigation';

type Props = RootStackScreenProps<'Notification'>;

const NotificationScreen: React.FC<Props> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* Top Navigation Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
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

        <View style={styles.headerSpacer} />
      </View>

      {/* Screen Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.screenTitle}>Notifications</Text>
      </View>

      {/* Notifications Body Component */}
      <View style={styles.body}>
        <NotificationComponent
          onNotificationPress={item => {
            if (item.step === 'review' || item.notificationType === 'correctionNeeded') {
              navigation.navigate('MainTabs');
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  backText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  centerLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    minWidth: 70,
  },
  titleContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  body: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default NotificationScreen;
