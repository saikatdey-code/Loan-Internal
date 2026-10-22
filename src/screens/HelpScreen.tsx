/**
 * HelpScreen — Help and support screen for WEmanipur.
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
import Svg, {Path, Rect} from 'react-native-svg';
import {Logo, WatermarkBackground} from '../components';
import {getAssistanceData, AssistanceData} from '../api/assistance';
import {
  getStoredAssistanceData,
  setStoredAssistanceData,
} from '../services/storage';

const HELP_TOPICS = [
  {
    title: 'How to check application status?',
    content:
      'Navigate to the Home screen where your active application card displays the real-time stage, days elapsed, and review notes.',
  },
  {
    title: 'Can I edit submitted applications?',
    content:
      'Once submitted, applications are locked for official review. To request modifications, contact the district helpdesk with your Application ID.',
  },
  {
    title: 'Documents rejected or blur?',
    content:
      'If your uploaded documents are not clear, our review officer will notify you via SMS to re-upload them through the applicant portal.',
  },
  {
    title: 'Payment and disbursement timeline',
    content:
      'Approved funds are disbursed directly to your Aadhaar-linked bank account via DBT within 15 working days from approval.',
  },
];

const HelpScreen: React.FC = () => {
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
        console.warn('[HelpScreen] Failed to fetch assistance data:', err);
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
          <Text style={styles.badgeText}>HELP & ASSISTANCE</Text>
        </View>

        <Text style={styles.screenTitle}>Help Center</Text>
        <Text style={styles.screenSubtitle}>
          Find quick answers to common questions or reach out to our dedicated
          support team.
        </Text>

        {/* Support channels card */}
        <View style={styles.supportCard}>
          <View style={styles.supportHeader}>
            <View style={styles.iconCircle}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 18V12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12V18"
                  stroke="#00875A"
                  strokeWidth={2}
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
            <View style={styles.supportHeaderText}>
              <Text style={styles.supportTitle}>Need immediate help?</Text>
              <Text style={styles.supportSub}>Our helpline is active Mon-Sat</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleCall(assistancePhone)}
            activeOpacity={0.7}>
            <Text style={styles.contactLabel}>Toll Free Helpline</Text>
            <Text style={styles.contactVal}>{assistancePhone}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleEmail(assistanceEmail)}
            activeOpacity={0.7}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactVal}>{assistanceEmail}</Text>
          </TouchableOpacity>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Working Hours</Text>
            <Text style={styles.contactVal}>{assistanceTiming}</Text>
          </View>
        </View>

        {/* FAQs accordion / list */}
        <Text style={styles.sectionHeader}>Common Inquiries</Text>
        <View style={styles.topicsList}>
          {HELP_TOPICS.map((topic, i) => (
            <View key={i} style={styles.topicCard}>
              <Text style={styles.topicQuestion}>{topic.title}</Text>
              <Text style={styles.topicAnswer}>{topic.content}</Text>
            </View>
          ))}
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
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportHeaderText: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  supportSub: {
    fontSize: 12,
    color: '#64748B',
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  contactLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  contactVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00875A',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  topicsList: {
    gap: 10,
  },
  topicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topicQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  topicAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});

export default HelpScreen;
