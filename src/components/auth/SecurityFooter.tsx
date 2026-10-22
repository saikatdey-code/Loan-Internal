/**
 * SecurityFooter — Centered lock icon with privacy assurance text.
 */
import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import Svg, {Rect, Path} from 'react-native-svg';
import {Colors} from '../../constants/colors';
import {Typography} from '../../constants/typography';
import {Layout} from '../../constants/layout';

interface SecurityFooterProps {
  style?: ViewStyle;
}

const SecurityFooter: React.FC<SecurityFooterProps> = ({style}) => {
  return (
    <View style={[styles.container, style]}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Rect
          x="3"
          y="11"
          width="18"
          height="11"
          rx="2"
          ry="2"
          stroke={Colors.textLight}
          strokeWidth={2}
        />
        <Path
          d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
          stroke={Colors.textLight}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.text}>
        Your information is safe with us. We follow strict security and privacy
        standards.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Layout.spacing.lg,
  },
  text: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    lineHeight: 15,
    color: Colors.textSecondary,
    textAlign: 'left',
  },
});

export default SecurityFooter;
