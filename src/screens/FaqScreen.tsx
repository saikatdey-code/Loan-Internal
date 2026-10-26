/**
 * FaqScreen — Frequently Asked Questions for WEmanipur.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {Logo, WatermarkBackground} from '../components';

const FAQS = [
  {
    q: 'What is the Women Empowerment Manipur Scheme?',
    a: 'It is a flagship initiative by the Government of Manipur providing direct financial assistance, entrepreneurship training, and livelihood subsidies to eligible women across all 16 districts.',
  },
  {
    q: 'Is Aadhaar mandatory for registration?',
    a: 'Yes, Aadhaar OTP-based authentication is required to verify identity and ensure DBT (Direct Benefit Transfer) directly into your linked bank account.',
  },
  {
    q: 'How long does application verification take?',
    a: 'Initial document scrutiny takes 3 to 7 working days. Once verified, field verification (if applicable) is scheduled within 10 days.',
  },
  {
    q: 'Can I apply for more than one economic activity?',
    a: 'Currently, one applicant can choose one primary economic activity per application cycle to ensure focused grant utilization.',
  },
  {
    q: 'What if my application is marked under review?',
    a: 'Under Review means your application and uploaded proofs have been successfully received and are currently being reviewed by the district verification team.',
  },
];

const FaqScreen: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>FREQUENTLY ASKED QUESTIONS</Text>
        </View>

        <Text style={styles.screenTitle}>FAQ</Text>
        <Text style={styles.screenSubtitle}>
          Answers to the most common queries about schemes, verification, and
          disbursement.
        </Text>

        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.faqCard, isExpanded && styles.faqCardActive]}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}>
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <Svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{
                      transform: [{rotate: isExpanded ? '180deg' : '0deg'}],
                    }}>
                    <Path
                      d="M6 9L12 15L18 9"
                      stroke={isExpanded ? '#00875A' : '#64748B'}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                {isExpanded && <Text style={styles.faqAnswer}>{faq.a}</Text>}
              </TouchableOpacity>
            );
          })}
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
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqCardActive: {
    borderColor: '#B6E3CB',
    backgroundColor: '#FAFCFB',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});

export default FaqScreen;
