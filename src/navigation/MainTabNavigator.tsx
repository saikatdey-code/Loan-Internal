/**
 * MainTabNavigator — 5-tab bottom navigation matching the WEmanipur design:
 * [ Home ] [ Guidelines ] [ Help ] [ Faq ] [ Contact ]
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle } from 'react-native-svg';
import HomeScreen from '../screens/HomeScreen';
import GuidelinesScreen from '../screens/GuidelinesScreen';
import HelpScreen from '../screens/HelpScreen';
import FaqScreen from '../screens/FaqScreen';
import ContactScreen from '../screens/ContactScreen';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom SVG Icons for the 5 tabs
const TabIcon: React.FC<{
  routeName: keyof MainTabParamList;
  focused: boolean;
}> = ({ routeName, focused }) => {
  const color = focused ? '#00875A' : '#64748B';

  switch (routeName) {
    case 'Home':
      return (
        <View style={styles.iconContainer}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15C14.4477 21 14 20.5523 14 20V15C14 14.4477 13.5523 14 13 14H11C10.4477 14 10 14.4477 10 15V20C10 20.5523 9.55228 21 9 21H4C3.44772 21 3 20.5523 3 20V9.5Z"
              fill={focused ? '#00875A' : 'none'}
              stroke={color}
              strokeWidth={focused ? 1.5 : 2}
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      );

    case 'Guidelines':
      return (
        <View style={styles.iconContainer}>
          <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <Path
              d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M14 2V8H20"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M16 13H8M16 17H8M10 9H8"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      );

    case 'Help':
      return (
        <View style={styles.iconContainer}>
          <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
            <Path
              d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.39913C11.0108 7.03015 11.7289 6.87898 12.4372 6.97046C13.1455 7.06194 13.7997 7.39055 14.292 7.89977C14.7843 8.40899 15.0848 9.06834 15.1438 9.77194C15.2028 10.4755 15.0166 11.1795 14.6154 11.7699C14.2141 12.3603 13.6226 12.8016 12.9366 13.0232C12.2507 13.2449 11.5126 13.2332 10.8354 12.99"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Circle cx="12" cy="17" r="1" fill={color} />
          </Svg>
        </View>
      );

    case 'Faq':
      return (
        <View style={styles.iconContainer}>
          <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Path
              d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      );

    case 'Contact':
      return (
        <View style={styles.iconContainer}>
          <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <Path
              d="M22 16.92V19.92C22 20.48 21.54 20.94 20.98 20.92C10.5 20.38 2.08 11.96 1.54 1.48C1.52 0.92 1.98 0.46 2.54 0.46H5.54C6.04 0.46 6.46 0.84 6.52 1.34C6.64 2.34 6.88 3.32 7.24 4.24C7.38 4.6 7.28 5.02 6.98 5.28L5.5 6.76C7.2 10.14 9.94 12.88 13.32 14.58L14.8 13.1C15.06 12.8 15.48 12.7 15.84 12.84C16.76 13.2 17.74 13.44 18.74 13.56C19.24 13.62 19.62 14.04 19.62 14.54V17.54"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      );

    default:
      return null;
  }
};

const TabLabel: React.FC<{
  focused: boolean;
  title: string;
}> = ({ focused, title }) => {
  return (
    <View style={styles.labelContainer}>
      <Text
        style={[
          styles.tabLabel,
          focused ? styles.tabLabelFocused : styles.tabLabelUnfocused,
        ]}>
        {title}
      </Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
};

const renderHomeIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon routeName="Home" focused={focused} />
);
const renderHomeLabel = ({ focused }: { focused: boolean }) => (
  <TabLabel focused={focused} title="Home" />
);

const renderGuidelinesIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon routeName="Guidelines" focused={focused} />
);
const renderGuidelinesLabel = ({ focused }: { focused: boolean }) => (
  <TabLabel focused={focused} title="Guidelines" />
);

const renderHelpIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon routeName="Help" focused={focused} />
);
const renderHelpLabel = ({ focused }: { focused: boolean }) => (
  <TabLabel focused={focused} title="Help" />
);

const renderFaqIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon routeName="Faq" focused={focused} />
);
const renderFaqLabel = ({ focused }: { focused: boolean }) => (
  <TabLabel focused={focused} title="Faq" />
);

const renderContactIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon routeName="Contact" focused={focused} />
);
const renderContactLabel = ({ focused }: { focused: boolean }) => (
  <TabLabel focused={focused} title="Contact" />
);

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00875A',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: renderHomeIcon,
          tabBarLabel: renderHomeLabel,
        }}
      />
      {/* <Tab.Screen
        name="Guidelines"
        component={GuidelinesScreen}
        options={{
          tabBarIcon: renderGuidelinesIcon,
          tabBarLabel: renderGuidelinesLabel,
        }}
      /> */}
      {/* <Tab.Screen
        name="Help"
        component={HelpScreen}
        options={{
          tabBarIcon: renderHelpIcon,
          tabBarLabel: renderHelpLabel,
        }}
      /> */}
      {/* <Tab.Screen
        name="Faq"
        component={FaqScreen}
        options={{
          tabBarIcon: renderFaqIcon,
          tabBarLabel: renderFaqLabel,
        }}
      /> */}
      {/* <Tab.Screen
        name="Contact"
        component={ContactScreen}
        options={{
          tabBarIcon: renderContactIcon,
          tabBarLabel: renderContactLabel,
        }}
      /> */}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabItem: {
    paddingVertical: 2,
  },
  iconContainer: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 11,
  },
  tabLabelFocused: {
    fontWeight: '700',
    color: '#00875A',
  },
  tabLabelUnfocused: {
    fontWeight: '500',
    color: '#64748B',
  },
  activeIndicator: {
    width: 16,
    height: 2.5,
    backgroundColor: '#00875A',
    borderRadius: 2,
    marginTop: 2,
  },
});

export default MainTabNavigator;
