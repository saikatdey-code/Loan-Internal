/**
 * SecurityNoticeCard — Green-tinted informational badge with a shield icon.
 * Used on Phone and OTP screens to convey security and process details.
 */
import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Colors} from '../../constants/colors';
import {Typography} from '../../constants/typography';
import {Layout} from '../../constants/layout';

interface SecurityNoticeCardProps {
  message: string;
  style?: ViewStyle;
}

const SecurityNoticeCard: React.FC<SecurityNoticeCardProps> = ({
  message,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconContainer}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          {/* Shield outline */}
          <Path
            d="M12 22S3 18 3 12V5L12 2L21 5V12C21 18 12 22 12 22Z"
            stroke={Colors.primary}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Checkmark inside shield */}
          <Path
            d="M9 12L11 14L15 10"
            stroke={Colors.primary}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F3',
    borderColor: '#D2EADB',
    borderWidth: 1,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    color: '#1B5E3C',
    fontWeight: Typography.fontWeight.medium,
  },
});

export default SecurityNoticeCard;
