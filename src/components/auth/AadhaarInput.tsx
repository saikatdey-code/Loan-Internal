/**
 * AadhaarInput — 12-digit Aadhaar number input split into 3 visual boxes (4 digits each).
 * Implemented using the single hidden TextInput architecture for rock-solid UX:
 * - Flawless multi-digit flow across all 3 boxes
 * - Seamless hardware & software keyboard input
 * - Automatic backspace and box-to-box transition
 * - Copy/paste support with spaces or dashes
 */
import React, {useRef, useState} from 'react';
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

interface AadhaarInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

type TextInputInstance = React.ElementRef<typeof TextInput>;

const AadhaarInput: React.FC<AadhaarInputProps> = ({
  value,
  onChangeText,
  error,
  autoFocus = false,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInputInstance | null>(null);

  const handleChangeText = (text: string) => {
    // Only allow digits, max 12
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 12);
    onChangeText(cleaned);
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  // Group digits into 3 blocks of 4
  const boxValues = [
    value.slice(0, 4),
    value.slice(4, 8),
    value.slice(8, 12),
  ];

  // Active box index based on how many digits entered
  const currentBoxIndex = Math.min(Math.floor(value.length / 4), 2);

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={handleContainerPress} style={styles.container}>
        {/* Hidden full-area input to capture all keystrokes */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          maxLength={12}
          keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          textContentType="none"
          autoFocus={autoFocus}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          style={styles.hiddenInput}
          caretHidden={true}
        />

        {/* 3 Visual 4-Digit Boxes */}
        <View style={styles.boxesRow} pointerEvents="none">
          {boxValues.map((chunk, index) => {
            const isActive = isFocused && index === currentBoxIndex;
            const isFilled = chunk.length === 4;

            return (
              <View
                key={index}
                style={[
                  styles.box,
                  isActive && styles.boxFocused,
                  isFilled && styles.boxFilled,
                  Boolean(error) && styles.boxError,
                ]}>
                <Text
                  style={[
                    styles.text,
                    !chunk && styles.placeholderText,
                  ]}>
                  {chunk || '0000'}
                </Text>
              </View>
            );
          })}
        </View>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    position: 'relative',
    width: '100%',
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
    color: 'transparent',
    fontSize: 16,
    height: '100%',
    width: '100%',
  },
  boxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  box: {
    flex: 1,
    height: 52,
    borderWidth: 1.2,
    borderColor: '#D8DDE1',
    borderRadius: Layout.borderRadius.lg,
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
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
  },
  boxError: {
    borderColor: Colors.error,
  },
  text: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: '#0F172A',
    letterSpacing: 2,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    color: '#CBD5E1',
    letterSpacing: 1.5,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
});

export default AadhaarInput;
