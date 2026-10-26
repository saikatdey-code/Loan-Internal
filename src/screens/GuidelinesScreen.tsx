/**
 * GuidelinesScreen — Scheme guidelines and eligibility criteria for WEmanipur.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Logo, WatermarkBackground } from '../components';

const GUIDELINES_DATA = [
  {
    id: '1',
    title: 'Eligibility Criteria',
    description:
      'Female residents of Manipur aged between 18 and 59 years with valid Aadhaar identification.',
    iconColor: '#00875A',
  },
  {
    id: '2',
    title: 'Required Documentation',
    description:
      'Aadhaar card, residential proof, family income certificate, active bank account details, and passport-size photograph.',
    iconColor: '#0284C7',
  },
  {
    id: '3',
    title: 'Income Limit',
    description:
      'Annual family income must not exceed ₹2,50,000 as per state government social welfare guidelines.',
    iconColor: '#E11D48',
  },
  {
    id: '4',
    title: 'Selection Process',
    description:
      'Applications undergo district-level scrutiny, physical verification if needed, and direct bank transfer upon approval.',
    iconColor: '#7C3AED',
  },
];

const GuidelinesScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>OFFICIAL GUIDELINES</Text>
        </View>

        <Text style={styles.screenTitle}>Scheme Guidelines</Text>
        <Text style={styles.screenSubtitle}>
          Everything you need to know about the Women Empowerment Manipur Scheme
          and application rules.
        </Text>

        <View style={styles.cardsContainer}>
          {GUIDELINES_DATA.map((item, index) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.numberBadge,
                    { backgroundColor: `${item.iconColor}15` },
                  ]}>
                  <Text style={[styles.numberText, { color: item.iconColor }]}>
                    0{index + 1}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Download PDF button */}
        {/* <TouchableOpacity style={styles.downloadButton} activeOpacity={0.8}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"
              stroke="#00875A"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M7 10L12 15L17 10"
              stroke="#00875A"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 15V3"
              stroke="#00875A"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.downloadButtonText}>
            Download Full Guidelines PDF
          </Text>
        </TouchableOpacity> */}
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
  cardsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#B6E3CB',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00875A',
  },
});

export default GuidelinesScreen;
