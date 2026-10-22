/**
 * AuthHeader — Top navigation header for auth screens.
 * Contains:
 * - "Back" button with arrow (left)
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Colors} from '../../constants/colors';
import {Typography} from '../../constants/typography';
import {Layout} from '../../constants/layout';

interface AuthHeaderProps {
  onBack?: () => void;
  showBack?: boolean;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({
  onBack,
  showBack = true,
}) => {
  return (
    <View style={styles.header}>
      {/* Back Button */}
      {showBack && onBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke={Colors.primary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Spacer to keep back button on the left */}
      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  placeholder: {
    width: 60,
  },
});

export default AuthHeader;
