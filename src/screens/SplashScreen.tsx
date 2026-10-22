/**
 * SplashScreen — High-end, clean launch screen for WEmanipur.
 * Features:
 * - Pure, minimal white background (no background shapes/auras behind the logo)
 * - Silk-smooth Apple cubic-bezier logo entrance (fade + scale + float-up)
 * - Staggered subtitle reveal
 * - Official Government of Manipur authority badge at the bottom
 * - Smooth exit crossfade
 */
import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Logo} from '../components';
import {getHasCompletedOnboarding, getToken} from '../services/storage';
import type {RootStackScreenProps} from '../types/navigation';

type Props = RootStackScreenProps<'Splash'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const SplashScreen: React.FC<Props> = ({navigation}) => {
  // 1. Logo Entrance & Physics
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoTranslateY = useRef(new Animated.Value(18)).current;

  // 2. Subtitle Reveal
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(10)).current;

  // 3. Official Badge & Global Exit
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance Choreography
    Animated.parallel([
      // Logo Entrance: Silky Apple Ease-Out Float & Scale
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 750,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 850,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 850,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),

      // Staggered Subtitle Reveal
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(subtitleTranslateY, {
            toValue: 0,
            duration: 650,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            useNativeDriver: true,
          }),
        ]),
      ]),

      // Staggered Government Badge Entrance
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(footerOpacity, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(footerTranslateY, {
            toValue: 0,
            duration: 650,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Smooth Exit & Navigation Transition after 2.4s
    const timer = setTimeout(async () => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(async () => {
        const token = await getToken();
        if (token && token.trim().length > 0) {
          navigation.replace('MainTabs', undefined);
        } else {
          navigation.replace('Onboarding', undefined);
        }
      });
    }, 2400);

    return () => clearTimeout(timer);
  }, [
    navigation,
    logoOpacity,
    logoScale,
    logoTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
    footerOpacity,
    footerTranslateY,
    screenOpacity,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Animated.View style={[styles.mainWrapper, {opacity: screenOpacity}]}>
        {/* Center Brand Identity (Pure white background, no shapes/auras behind) */}
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  {scale: logoScale},
                  {translateY: logoTranslateY},
                ],
              },
            ]}>
            <Logo size="large" showSubtitle={false} />
          </Animated.View>

          {/* Subtitle with staggered reveal */}
          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: subtitleOpacity,
                transform: [{translateY: subtitleTranslateY}],
              },
            ]}>
            <Text style={styles.subtitle}>WOMEN EMPOWERMENT MANIPUR</Text>
          </Animated.View>
        </View>

        {/* Bottom Section: Official Government Authority Badge */}
        <Animated.View
          style={[
            styles.footerContainer,
            {
              opacity: footerOpacity,
              transform: [{translateY: footerTranslateY}],
            },
          ]}>
          <View style={styles.footerBadge}>
            <View style={styles.footerGreenDot} />
            <Text style={styles.footerText}>GOVERNMENT OF MANIPUR</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7A8D',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
  },
  footerGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00875A',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
