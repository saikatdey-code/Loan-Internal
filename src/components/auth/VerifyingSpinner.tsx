/**
 * VerifyingSpinner — Animated circular progress arc spinner for the "Verifying OTP" step.
 * Smooth 60fps hardware-accelerated continuous rotation.
 */
import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {Colors} from '../../constants/colors';

interface VerifyingSpinnerProps {
  size?: number;
  strokeWidth?: number;
}

const VerifyingSpinner: React.FC<VerifyingSpinnerProps> = ({
  size = 72,
  strokeWidth = 6,
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 65% arc length
  const strokeDashoffset = circumference * 0.35;

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Animated.View style={{transform: [{rotate: spin}]}}>
        <Svg width={size} height={size}>
          {/* Background track circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Active rotating arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.primary}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
});

export default VerifyingSpinner;
