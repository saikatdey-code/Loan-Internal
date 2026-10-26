/**
 * SplashScreen — High-end, clean launch screen.
 * Displays an animated "Hello" front and center with smooth Apple-grade choreography.
 */
import React, {useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getToken} from '../services/storage';
import type {RootStackScreenProps} from '../types/navigation';

type Props = RootStackScreenProps<'Splash'>;

const LETTERS = ['H', 'e', 'l', 'l', 'o'];

const SplashScreen: React.FC<Props> = ({navigation}) => {
  // Staggered letters entrance animation values
  const letterAnims = useRef(
    LETTERS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(32),
      scale: new Animated.Value(0.7),
    })),
  ).current;

  // Soft ambient halo glow
  const auraOpacity = useRef(new Animated.Value(0)).current;
  const auraScale = useRef(new Animated.Value(0.6)).current;

  // Gentle floating / breathing idle animation
  const floatY = useRef(new Animated.Value(0)).current;

  // Screen exit crossfade + slight zoom
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Aura glow entrance
    const auraAnimation = Animated.parallel([
      Animated.timing(auraOpacity, {
        toValue: 0.8,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(auraScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
    ]);

    // 2. Staggered letters entrance (delightful spring bounce)
    const letterAnimations = Animated.stagger(
      80,
      letterAnims.map(anim =>
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: 0,
            tension: 75,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    // 3. Gentle breathing idle float
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -8,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    // Run entrance sequence
    Animated.parallel([
      auraAnimation,
      Animated.sequence([
        Animated.delay(120),
        letterAnimations,
      ]),
    ]).start(() => {
      floatAnimation.start();
    });

    // 4. Smooth Exit & Navigation Transition after 2.4s
    const timer = setTimeout(async () => {
      floatAnimation.stop();
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(screenScale, {
          toValue: 1.06,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(async () => {
        const token = await getToken();
        if (token && token.trim().length > 0) {
          navigation.replace('MainTabs', undefined);
        } else {
          navigation.replace('Auth', { screen: 'Login' });
        }
      });
    }, 2400);

    return () => {
      clearTimeout(timer);
      floatAnimation.stop();
    };
  }, [navigation, letterAnims, auraOpacity, auraScale, floatY, screenOpacity, screenScale]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Animated.View
        style={[
          styles.screenWrapper,
          {
            opacity: screenOpacity,
            transform: [{scale: screenScale}],
          },
        ]}>
        <Animated.View
          style={[
            styles.helloContainer,
            {
              transform: [{translateY: floatY}],
            },
          ]}>
          {/* Ambient soft glow aura */}
          <Animated.View
            style={[
              styles.aura,
              {
                opacity: auraOpacity,
                transform: [{scale: auraScale}],
              },
            ]}
          />

          {/* Staggered animated letters */}
          <View style={styles.lettersRow}>
            {LETTERS.map((char, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.letter,
                  {
                    opacity: letterAnims[index].opacity,
                    transform: [
                      {translateY: letterAnims[index].translateY},
                      {scale: letterAnims[index].scale},
                    ],
                  },
                ]}>
                {char}
              </Animated.Text>
            ))}
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
  screenWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helloContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 260,
    height: 180,
  },
  aura: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E8F5EF',
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 58,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1.2,
    includeFontPadding: false,
  },
});

export default SplashScreen;
