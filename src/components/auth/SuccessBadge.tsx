/**
 * SuccessBadge — Large green circular badge with white checkmark and radiating rays.
 * Used on the "Login Successful" screen matching the design.
 */
import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';
import Svg, {Circle, Path, Line, G} from 'react-native-svg';
import {Colors} from '../../constants/colors';

interface SuccessBadgeProps {
  size?: number;
}

const SuccessBadge: React.FC<SuccessBadgeProps> = ({size = 110}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  // Radiating rays around the badge
  const rayCount = 8;
  const rays = Array.from({length: rayCount}, (_, i) => {
    const angle = (i * 360) / rayCount;
    return {angle};
  });

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Animated.View
        style={{
          transform: [{scale: scaleAnim}],
          opacity: opacityAnim,
        }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Radiating Rays */}
          <G stroke="#6EE7B7" strokeWidth="2.5" strokeLinecap="round">
            {rays.map((ray, i) => (
              <Line
                key={i}
                x1="50"
                y1="6"
                x2="50"
                y2="13"
                transform={`rotate(${ray.angle} 50 50)`}
              />
            ))}
          </G>

          {/* Soft outer glow ring */}
          <Circle cx="50" cy="50" r="36" fill="#E6F7ED" />

          {/* Main green circle */}
          <Circle cx="50" cy="50" r="28" fill={Colors.primary} />

          {/* Crisp checkmark */}
          <Path
            d="M40 50.5 L46.5 57 L60.5 43"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
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
    marginVertical: 18,
  },
});

export default SuccessBadge;
