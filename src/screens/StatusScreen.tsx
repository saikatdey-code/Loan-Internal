/**
 * StatusScreen — Placeholder tab screen.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors} from '../constants/colors';
import {Typography} from '../constants/typography';
import {Layout} from '../constants/layout';
import {WatermarkBackground} from '../components';

const StatusScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Application Status</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.title}>Track Your Application</Text>
        <Text style={styles.subtitle}>
          View real-time status updates for your submitted applications.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing['2xl'],
  },
  icon: {
    fontSize: 48,
    marginBottom: Layout.spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    lineHeight: Typography.fontSize.md * Typography.lineHeight.relaxed,
  },
});

export default StatusScreen;
