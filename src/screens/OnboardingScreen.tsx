/**
 * OnboardingScreen — Matches the WEmanipur UI design reference.
 * Features centered header logo, top-right skip button, hero typography,
 * edge-to-edge illustration, and curved bottom sheet with pagination dots and CTAs.
 */
import React, {useRef, useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Logo, Button, PaginationDots} from '../components';
import {setHasCompletedOnboarding} from '../services/storage';
import type {RootStackScreenProps} from '../types/navigation';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const ILLUSTRATION_ASPECT_RATIO = 896 / 700;
const ILLUSTRATION_HEIGHT = Math.round(SCREEN_WIDTH / ILLUSTRATION_ASPECT_RATIO);

type Props = RootStackScreenProps<'Onboarding'>;

// ─── Slide Data ──────────────────────────────────────────────
interface SlideData {
  id: string;
  title1: string;
  title2: string;
  description: string;
  image: ImageSourcePropType;
  resizeMode: 'cover' | 'contain';
}

const SLIDES: SlideData[] = [
  {
    id: '1',
    title1: 'Women who thrive.',
    title2: 'Communities that rise.',
    description:
      'A single digital platform helping women access government scheme assistance with ease and confidence.',
    image: require('../assets/images/onboarding_slide_1.jpg'),
    resizeMode: 'contain',
  },
  {
    id: '2',
    title1: 'Simple Access',
    title2: 'to Government Support',
    description:
      'Apply for schemes, complete Aadhaar-based verification and track your application — all in one place.',
    image: require('../assets/images/onboarding_slide_2.jpg'),
    resizeMode: 'contain',
  },
  {
    id: '3',
    title1: 'Secure, Transparent',
    title2: 'and Inclusive',
    description:
      'Your data is secure, your application is tracked in real time, and benefits reach those who need it most.',
    image: require('../assets/images/onboarding_slide_3.jpg'),
    resizeMode: 'contain',
  },
];

// ─── Component ───────────────────────────────────────────────
const OnboardingScreen: React.FC<Props> = ({navigation}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideData>>(null);

  const handleApply = useCallback(() => {
    navigation.navigate('AadhaarAuth');
  }, [navigation]);

  const handleSkip = useCallback(async () => {
    await setHasCompletedOnboarding(true);
    navigation.navigate('Auth', {screen: 'LoginMethod'});
  }, [navigation]);

  const handleLogin = useCallback(async () => {
    await setHasCompletedOnboarding(true);
    navigation.navigate('Auth', {screen: 'LoginMethod'});
  }, [navigation]);

  const handleDotPress = useCallback((index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  }, []);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setActiveIndex(index);
    },
    [],
  );

  // ─── Render Slide ──────────────────────────────────────────
  const renderSlide = useCallback(({item}: {item: SlideData}) => {
    return (
      <View style={styles.slide}>
        {/* Title & Description */}
        <View style={styles.textContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.titlePrimary}>{item.title1}</Text>
            <Text style={styles.titleSecondary}>{item.title2}</Text>
          </View>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={item.image}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Fixed Top Header: Centered Logo + Top-Right Skip */}
      <View style={styles.header}>
        <Logo size="small" showSubtitle={true} />
        {activeIndex < SLIDES.length - 1 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}
            activeOpacity={0.7}>
            <Text style={styles.skipText}>
              Skip <Text style={styles.skipChevron}>›</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Swipeable Slide Content */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={info => {
          flatListRef.current?.scrollToOffset({
            offset: info.index * SCREEN_WIDTH,
            animated: true,
          });
        }}
        style={styles.carousel}
      />

      {/* Curved White Bottom Card */}
      <View style={styles.bottomCard}>
        {/* Pagination Dots */}
        <View style={styles.dotsWrapper}>
          <PaginationDots
            total={SLIDES.length}
            activeIndex={activeIndex}
            onDotPress={handleDotPress}
          />
        </View>

        {/* Primary CTA */}
        <Button
          title="Apply for Financial Assistance"
          rightIcon={<Text style={styles.buttonArrow}>→</Text>}
          onPress={handleApply}
          variant="primary"
          style={styles.ctaButton}
          textStyle={styles.ctaButtonText}
        />

        {/* Secondary CTA */}
        <Button
          title="Login"
          onPress={handleLogin}
          variant="secondary"
          style={styles.loginButton}
          textStyle={styles.loginButtonText}
        />
      </View>
    </SafeAreaView>
  );
};


// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAF8',
  },
  // Header
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 4,
    position: 'relative',
    minHeight: 110,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00875A',
  },
  skipChevron: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00875A',
    lineHeight: 18,
  },
  // Carousel & Slide
  carousel: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
  },
  textContainer: {
    minHeight: 142,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 6,
  },
  titleContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  titlePrimary: {
    fontSize: 27,
    fontWeight: '700',
    color: '#101828',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  titleSecondary: {
    fontSize: 27,
    fontWeight: '700',
    color: '#00875A',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13.5,
    fontWeight: '400',
    color: '#556477',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 28,
    maxWidth: 340,
    alignSelf: 'center',
  },
  illustrationContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  illustration: {
    width: SCREEN_WIDTH,
    height: ILLUSTRATION_HEIGHT,
  },
  // Curved Bottom Sheet
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    marginTop: -32,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  dotsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#00875A',
    marginBottom: 12,
    shadowColor: '#00875A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 6,
    lineHeight: 18,
  },
  loginButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00875A',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00875A',
  },
});

export default OnboardingScreen;
