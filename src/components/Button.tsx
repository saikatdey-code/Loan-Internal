/**
 * Reusable Button component with Primary and Secondary variants.
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {Colors} from '../constants/colors';
import {Typography} from '../constants/typography';
import {Layout} from '../constants/layout';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  rightIcon,
  style,
  textStyle,
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? Colors.textOnPrimary : Colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.contentRow}>
          <Text
            style={[
              styles.text,
              isPrimary && styles.primaryText,
              isSecondary && styles.secondaryText,
              isGhost && styles.ghostText,
              disabled && styles.disabledText,
              textStyle,
            ]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing['2xl'],
  },
  primary: {
    backgroundColor: Colors.primary,
    ...Layout.shadow.md,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconContainer: {
    marginLeft: 8,
  },
  text: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  primaryText: {
    color: Colors.textOnPrimary,
  },
  secondaryText: {
    color: Colors.primary,
  },
  ghostText: {
    color: Colors.primary,
  },
  disabledText: {
    color: Colors.textLight,
  },
});

export default Button;
