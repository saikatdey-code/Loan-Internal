/**
 * PhoneInputField — Mobile number input component.
 * Features:
 * - Phone icon
 * - Fixed country code prefix (+91)
 * - Vertical separator
 * - Numeric input (10 digits) with full physical & software keyboard support
 * - Pressable container to focus input from anywhere on the box
 * - Clear button when input has value
 */
import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import Svg, {Rect, Path} from 'react-native-svg';
import {Colors} from '../../constants/colors';
import {Typography} from '../../constants/typography';
import {Layout} from '../../constants/layout';

interface PhoneInputFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  autoFocus?: boolean;
  style?: ViewStyle;
}

type TextInputInstance = React.ElementRef<typeof TextInput>;

const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  value,
  onChangeText,
  error,
  autoFocus = false,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInputInstance | null>(null);

  const handleChange = (text: string) => {
    // Strip non-digits
    let cleaned = text.replace(/\D/g, '');
    // If pasted with country code 91 and > 10 digits, strip leading 91
    if (cleaned.length > 10 && cleaned.startsWith('91')) {
      cleaned = cleaned.slice(2);
    }
    onChangeText(cleaned.slice(0, 10));
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>Mobile Number</Text>
      <Pressable
        onPress={handleContainerPress}
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          Boolean(error) && styles.inputContainerError,
        ]}>
        {/* Smartphone Icon */}
        <View style={styles.iconContainer} pointerEvents="none">
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Rect
              x="5"
              y="2"
              width="14"
              height="20"
              rx="2.5"
              stroke={isFocused ? Colors.primary : Colors.textLight}
              strokeWidth={1.8}
            />
            <Path
              d="M12 18H12.01"
              stroke={isFocused ? Colors.primary : Colors.textLight}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* Country Code */}
        <Text style={styles.countryCode} pointerEvents="none">+91</Text>

        {/* Vertical Divider */}
        <View style={styles.divider} pointerEvents="none" />

        {/* Number Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="Enter your mobile number"
          placeholderTextColor="#94A3B8"
          keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          maxLength={10}
          editable={true}
          returnKeyType="done"
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textContentType="telephoneNumber"
          autoComplete="tel"
        />

        {/* Clear Button */}
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={styles.clearButton}>
            <View style={styles.clearCircle}>
              <Text style={styles.clearText}>✕</Text>
            </View>
          </TouchableOpacity>
        )}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: '#1E293B',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.2,
    borderColor: '#D8DDE1',
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Layout.spacing.md,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FAFCFA',
    ...Layout.shadow.sm,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  iconContainer: {
    paddingRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    paddingHorizontal: 4,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#DDE2E5',
    marginHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingHorizontal: 4,
    height: 48,
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 11,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default PhoneInputField;
