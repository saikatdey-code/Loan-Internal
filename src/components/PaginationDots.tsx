/**
 * Pagination dots indicator for onboarding carousel.
 */
import React from 'react';
import {View, StyleSheet, Animated, TouchableOpacity} from 'react-native';

interface PaginationDotsProps {
  total: number;
  activeIndex: number;
  onDotPress?: (index: number) => void;
}

const PaginationDots: React.FC<PaginationDotsProps> = ({
  total,
  activeIndex,
  onDotPress,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({length: total}).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={index}
            onPress={() => onDotPress?.(index)}
            disabled={!onDotPress}
            hitSlop={{top: 14, bottom: 14, left: 10, right: 10}}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${index + 1}`}>
            <Animated.View
              style={[
                styles.dot,
                isActive ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  activeDot: {
    backgroundColor: '#00875A',
  },
  inactiveDot: {
    backgroundColor: '#B6DFC9',
  },
});

export default PaginationDots;
