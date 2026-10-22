import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path, Circle} from 'react-native-svg';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

interface ToastProps extends ToastOptions {
  onDismiss: () => void;
}

const TYPE_CONFIG = {
  success: {
    title: 'Success',
    iconBg: '#ECFDF5',
    iconColor: '#10B981',
    accentBorder: '#10B981',
    progressColor: '#10B981',
    titleColor: '#065F46',
  },
  error: {
    title: 'Error',
    iconBg: '#FEF2F2',
    iconColor: '#EF4444',
    accentBorder: '#EF4444',
    progressColor: '#EF4444',
    titleColor: '#991B1B',
  },
  info: {
    title: 'Notice',
    iconBg: '#F0F9FF',
    iconColor: '#0284C7',
    accentBorder: '#0284C7',
    progressColor: '#0284C7',
    titleColor: '#075985',
  },
  warning: {
    title: 'Warning',
    iconBg: '#FFFBEB',
    iconColor: '#F59E0B',
    accentBorder: '#F59E0B',
    progressColor: '#F59E0B',
    titleColor: '#92400E',
  },
};

export const Toast: React.FC<ToastProps> = ({
  type = 'success',
  title,
  message,
  duration = 3500,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.success;

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance animation (Spring drop + fade)
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Linear progress bar animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();

    // 3. Auto dismiss timer
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" fill={config.iconColor} />
            <Path
              d="M8 12.5L10.5 15L16 9.5"
              stroke="#FFFFFF"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'error':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" fill={config.iconColor} />
            <Path
              d="M12 8V12M12 16H12.01"
              stroke="#FFFFFF"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'warning':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3L2 21H22L12 3Z"
              fill={config.iconColor}
              stroke={config.iconColor}
              strokeWidth={1.5}
            />
            <Path
              d="M12 9V14M12 17H12.01"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        );
      case 'info':
      default:
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" fill={config.iconColor} />
            <Path
              d="M12 8V8.01M12 11V16"
              stroke="#FFFFFF"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </Svg>
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top + (Platform.OS === 'ios' ? 8 : 16),
          transform: [{translateY}],
          opacity,
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleDismiss}
        style={[styles.card, {borderLeftColor: config.accentBorder}]}>
        <View style={styles.cardContent}>
          {/* Icon badge */}
          <View style={[styles.iconContainer, {backgroundColor: config.iconBg}]}>
            {renderIcon()}
          </View>

          {/* Text block */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, {color: config.titleColor}]}>
              {title || config.title}
            </Text>
            <Text style={styles.message} numberOfLines={3}>
              {message}
            </Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6L18 18"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Dynamic progress bar at the bottom */}
        <View style={styles.progressBackground}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: config.progressColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 4.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  progressBackground: {
    height: 3,
    width: '100%',
    backgroundColor: '#F1F5F9',
  },
  progressBar: {
    height: '100%',
  },
});
