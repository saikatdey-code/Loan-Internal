/**
 * LandscapeFooter — Vector illustration of Manipur hills, Kangla monuments, and trees.
 * Rendered at the bottom of authentication screens matching the design reference.
 */
import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import Svg, {Path, Circle, Rect, G} from 'react-native-svg';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface LandscapeFooterProps {
  height?: number;
}

const LandscapeFooter: React.FC<LandscapeFooterProps> = ({height = 140}) => {
  return (
    <View style={[styles.container, {height}]} pointerEvents="none">
      <Svg
        width={SCREEN_WIDTH}
        height={height}
        viewBox="0 0 375 140"
        preserveAspectRatio="xMidYMax slice"
        pointerEvents="none">
        {/* Background layer: Far gentle hills */}
        <Path
          d="M-20,90 Q50,45 130,75 T280,60 T400,75 L400,140 L-20,140 Z"
          fill="#E6F4ED"
          opacity={0.8}
        />

        {/* Mid layer: Rolling hills */}
        <Path
          d="M-20,105 Q60,60 160,85 T310,70 T400,80 L400,140 L-20,140 Z"
          fill="#CDE8DA"
          opacity={0.7}
        />

        {/* Monument / Temple Silhouette (Kangla style tiered spire) on the right hill */}
        <G fill="#7AB899" opacity={0.85}>
          {/* Main Spire Base */}
          <Rect x="238" y="90" width="30" height="25" rx="1" />
          <Rect x="242" y="78" width="22" height="13" rx="1" />
          <Rect x="246" y="68" width="14" height="11" rx="1" />
          <Path d="M253,52 L250,68 L256,68 Z" />
          {/* Spire tip pin */}
          <Rect x="252.5" y="47" width="1" height="6" />

          {/* Temple side wings */}
          <Path d="M234,105 L238,92 L238,105 Z" />
          <Path d="M272,105 L268,92 L268,105 Z" />

          {/* Arches / Details */}
          <Path
            d="M249,102 Q253,97 257,102 L257,115 L249,115 Z"
            fill="#CDE8DA"
          />
          <Circle cx="253" cy="74" r="2.5" fill="#CDE8DA" />
        </G>

        {/* Foreground hill: Front rolling landscape */}
        <Path
          d="M-20,120 Q80,82 190,110 T340,95 T400,102 L400,140 L-20,140 Z"
          fill="#B5DFC8"
          opacity={0.75}
        />

        {/* Stylized Trees - Left Cluster */}
        <G fill="#5BAE84">
          {/* Tree 1 */}
          <Rect x="18" y="112" width="2" height="12" fill="#3A8E65" />
          <Circle cx="19" cy="108" r="7" />

          {/* Tree 2 */}
          <Rect x="32" y="115" width="2" height="10" fill="#3A8E65" />
          <Circle cx="33" cy="111" r="5" />

          {/* Tree 3 */}
          <Rect x="44" y="118" width="1.5" height="9" fill="#3A8E65" />
          <Circle cx="45" cy="115" r="4.5" />

          {/* Tree 4 */}
          <Rect x="68" y="114" width="2" height="11" fill="#3A8E65" />
          <Circle cx="69" cy="110" r="6" />

          {/* Mid Tree */}
          <Rect x="120" y="120" width="1.5" height="9" fill="#3A8E65" />
          <Circle cx="121" cy="117" r="4.5" />
        </G>

        {/* Stylized Trees - Right Cluster (near temple) */}
        <G fill="#5BAE84">
          <Rect x="222" y="110" width="2" height="12" fill="#3A8E65" />
          <Circle cx="223" cy="106" r="6.5" />

          <Rect x="282" y="110" width="2" height="12" fill="#3A8E65" />
          <Circle cx="283" cy="105" r="7.5" />

          <Rect x="298" y="115" width="2" height="10" fill="#3A8E65" />
          <Circle cx="299" cy="112" r="5" />

          <Rect x="312" y="118" width="1.5" height="8" fill="#3A8E65" />
          <Circle cx="313" cy="115" r="4" />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    overflow: 'hidden',
  },
});

export default LandscapeFooter;
