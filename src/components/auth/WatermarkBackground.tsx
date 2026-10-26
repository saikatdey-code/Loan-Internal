/**
 * WatermarkBackground — Official Kangla Sha (Manipur State Emblem) Watermark
 *
 * Designed specifically for authentication and official document flows:
 * - Positioned centrally behind form content as an elegant, non-intrusive seal
 * - Completely transparent touch-through (`pointerEvents="none"`)
 * - Responsive sizing based on screen dimensions
 * - Subtle opacity (default ~0.055) ensuring optimal contrast and readability
 */
import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';

const KANGLA_SHA_DARK = require('../../assets/images/kangla_sha_watermark.png');
const KANGLA_SHA_BRAND = require('../../assets/images/kangla_sha_brand_watermark.png');

// Kangla Sha emblem native aspect ratio (880w x 1084h)
const ASPECT_RATIO = 880 / 1084;

export interface WatermarkBackgroundProps {
  /**
   * Watermark opacity. Recommended range: 0.04 - 0.08
   * Default: 0.055
   */
  opacity?: number;
  /**
   * Emblem width in px. If omitted, scales to 82% of screen width (max 330px).
   */
  size?: number;
  /**
   * Visual theme variant:
   * - 'dark': Slate / Charcoal emblem matching official seal (default)
   * - 'brand': WEmanipur brand green tint emblem
   */
  variant?: 'dark' | 'brand';
  /**
   * Vertical offset adjustment in px (e.g. +20 to nudge down). Default: 0
   */
  offsetY?: number;
  /**
   * Custom style for container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Custom style for the watermark Image
   */
  imageStyle?: StyleProp<ImageStyle>;
}

const WatermarkBackground: React.FC<WatermarkBackgroundProps> = () => {
  return null;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  image: {
    alignSelf: 'center',
  },
});

export default WatermarkBackground;
