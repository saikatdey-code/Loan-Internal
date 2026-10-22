/**
 * ContactScreen — Contact Information & District Offices for WEmanipur.
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import {Logo, WatermarkBackground} from '../components';
import {getAssistanceData, AssistanceData} from '../api/assistance';
import {
  getStoredAssistanceData,
  setStoredAssistanceData,
} from '../services/storage';

const ContactScreen: React.FC = () => {
  const [assistanceData, setAssistanceData] = useState<AssistanceData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAssistance = async () => {
      try {
        const cached = await getStoredAssistanceData<AssistanceData>();
        if (cached && isMounted) {
          setAssistanceData(cached);
        }
        const res = await getAssistanceData();
        if (res && res.success && res.data && isMounted) {
          setAssistanceData(res.data);
          await setStoredAssistanceData(res.data);
        }
      } catch (err) {
        console.warn('[ContactScreen] Failed to fetch assistance data:', err);
      }
    };

    fetchAssistance();
    return () => {
      isMounted = false;
    };
  }, []);

  const assistancePhone = assistanceData?.phone || '1800-XXX-XXXX';
  const assistanceEmail = assistanceData?.email || 'support@wemanipur.gov.in';
  const assistanceTiming =
    assistanceData?.timing || 'Mon - Sat, 9:00 AM to 6:00 PM';

  const handleCall = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone) {
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      <View style={styles.header}>
        <Logo size="small" showSubtitle={false} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>GET IN TOUCH</Text>
        </View>

        <Text style={styles.screenTitle}>Contact Us</Text>
        <Text style={styles.screenSubtitle}>
          We are here to assist you with any questions or support needed
          throughout your application.
        </Text>

        {/* Head Office Card */}
        <View style={styles.card}>
          <Text style={styles.cardCategory}>STATE HEADQUARTERS</Text>
          <Text style={styles.officeTitle}>
            Directorate of Social Welfare, Government of Manipur
          </Text>
          <Text style={styles.officeAddress}>
            Babupara, Imphal West, Manipur — 795001
          </Text>

          <View style={styles.divider} />

          {/* Phone */}
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => handleCall(assistancePhone)}
            activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M22 16.92V19.92C22 20.48 21.54 20.94 20.98 20.92C10.5 20.38 2.08 11.96 1.54 1.48C1.52 0.92 1.98 0.46 2.54 0.46H5.54C6.04 0.46 6.46 0.84 6.52 1.34C6.64 2.34 6.88 3.32 7.24 4.24C7.38 4.6 7.28 5.02 6.98 5.28L5.5 6.76C7.2 10.14 9.94 12.88 13.32 14.58L14.8 13.1C15.06 12.8 15.48 12.7 15.84 12.84C16.76 13.2 17.74 13.44 18.74 13.56C19.24 13.62 19.62 14.04 19.62 14.54V17.54"
                  stroke="#00875A"
                  strokeWidth={2}
                />
              </Svg>
            </View>
            <View style={styles.contactTextWrapper}>
              <Text style={styles.contactLabel}>Toll Free Helpline</Text>
              <Text style={styles.contactValue}>{assistancePhone}</Text>
            </View>
          </TouchableOpacity>

          {/* Email */}
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => handleEmail(assistanceEmail)}
            activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Rect
                  x="2"
                  y="4"
                  width="20"
                  height="16"
                  rx="3"
                  stroke="#00875A"
                  strokeWidth={2}
                />
                <Path d="M2 7L12 13L22 7" stroke="#00875A" strokeWidth={2} />
              </Svg>
            </View>
            <View style={styles.contactTextWrapper}>
              <Text style={styles.contactLabel}>Email Address</Text>
              <Text style={styles.contactValue}>{assistanceEmail}</Text>
            </View>
          </TouchableOpacity>

          {/* Hours */}
          <View style={styles.contactRow}>
            <View style={styles.iconCircle}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#00875A" strokeWidth={2} />
                <Path d="M12 6V12L16 14" stroke="#00875A" strokeWidth={2} />
              </Svg>
            </View>
            <View style={styles.contactTextWrapper}>
              <Text style={styles.contactLabel}>Office Hours</Text>
              <Text style={styles.contactValue}>{assistanceTiming}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00875A',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardCategory: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00875A',
    letterSpacing: 0.6,
  },
  officeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  officeAddress: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextWrapper: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  contactValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});

export default ContactScreen;
