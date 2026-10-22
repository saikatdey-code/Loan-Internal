/**
 * OtpInputBoxes — 6-digit OTP entry with individual visual input boxes.
 * Uses the industry-standard single hidden TextInput architecture for:
 * - Flawless multi-digit typing without focus drop or race conditions
 * - Seamless hardware keyboard and software keyboard compatibility
 * - Full SMS OTP Auto-fill and clipboard paste support
 * - Automatic backspace and digit progression
 */
import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import {Colors} from '../../constants/colors';
import {Typography} from '../../constants/typography';
import {Layout} from '../../constants/layout';

interface OtpInputBoxesProps {
  length?: number;
  value: string;
  onChangeOtp: (otp: string) => void;
  autoFocus?: boolean;
}

type TextInputInstance = React.ElementRef<typeof TextInput>;

const OtpInputBoxes: React.FC<OtpInputBoxesProps> = ({
  length = 6,
  value,
  onChangeOtp,
  autoFocus = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInputInstance | null>(null);

  useEffect(() => {
    if (autoFocus) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [autoFocus]);

  const handleChangeText = (text: string) => {
    // Only allow numeric digits up to specified length
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    onChangeOtp(cleaned);
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <Pressable
      onPress={handleContainerPress}
      style={styles.container}
      accessible={true}
      accessibilityLabel="OTP Input">
      {/* Hidden full-area TextInput to capture all keystrokes, autofill, and paste */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        maxLength={length}
        keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.hiddenInput}
        caretHidden={true}
        selectTextOnFocus={false}
      />

      {/* Visual digit boxes */}
      <View style={styles.boxesRow} pointerEvents="none">
        {Array.from({length}).map((_, index) => {
          const digit = value[index] || '';
          const isFilled = Boolean(digit);
          // Highlight current active box (the one being typed into)
          const isCurrentActive =
            isFocused &&
            (index === value.length || (index === length - 1 && value.length === length));

          return (
            <View
              key={index}
              style={[
                styles.box,
                isFilled && styles.boxFilled,
                isCurrentActive && styles.boxFocused,
              ]}>
              <Text
                style={[
                  styles.digitText,
                  !digit && styles.placeholderText,
                ]}>
                {digit || '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Layout.spacing.lg,
    width: '100%',
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
    color: 'transparent',
    fontSize: 1,
  },
  boxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  box: {
    width: 46,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#D2D8DD',
    borderRadius: Layout.borderRadius.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FAFCFA',
    ...Layout.shadow.sm,
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  digitText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: '#0F172A',
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.regular,
    color: '#CBD5E1',
  },
});

export default OtpInputBoxes;
