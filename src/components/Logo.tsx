/**
 * WEmanipur Logo component — renders the official logo image + subtitle text.
 * The logo image already contains the "WEManipur" brand name,
 * so this component only adds the subtitle below.
 */
import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import {Typography} from '../constants/typography';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'header';
  showSubtitle?: boolean;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

// Logo image contains both icon + "WEManipur" text with surrounding transparent padding.
// Dimensions are scaled up so the brand mark and text remain clearly legible across all screens.
const LOGO_SIZES = {
  header: {width: 92, height: 78},
  small: {width: 112, height: 96},
  medium: {width: 155, height: 132},
  large: {width: 225, height: 190},
};

const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showSubtitle = true,
  width: customWidth,
  height: customHeight,
  style,
  imageStyle,
}) => {
  // If no subtitle is shown (like in navigation top bars), use header-friendly dimensions if size is small
  const defaultSize =
    !showSubtitle && size === 'small' ? LOGO_SIZES.header : LOGO_SIZES[size];

  const width = customWidth ?? defaultSize.width;
  const height = customHeight ?? defaultSize.height;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../assets/images/logo.png')}
        style={[styles.logoImage, {width, height}, imageStyle]}
        resizeMode="contain"
      />
      {showSubtitle && (
        <Text
          style={[
            styles.subtitle,
            size === 'small' && styles.subtitleSmall,
          ]}>
          WOMEN EMPOWERMENT MANIPUR
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    backgroundColor: 'transparent',
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: '#6B7A8D',
    letterSpacing: 1.5,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  subtitleSmall: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 4,
    color: '#6B7A8D',
  },
});

export default Logo;
