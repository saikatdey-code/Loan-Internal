/**
 * RootNavigator — Stack navigator controlling the main app flow.
 * Splash → Onboarding (first launch) or MainTabs (returning user).
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import {
  AadhaarAuthScreen,
  ApplicationSuccessScreen,
  MobileVerificationScreen,
} from '../screens/auth';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import SHGDetailsScreen from '../screens/SHGDetailsScreen';
import AddressScreen from '../screens/AddressScreen';
import IncomeDetailsScreen from '../screens/IncomeDetailsScreen';
import EconomicActivityScreen from '../screens/EconomicActivityScreen';
import ReviewApplicationScreen from '../screens/ReviewApplicationScreen';
import ApplicationDetailsScreen from '../screens/ApplicationDetailsScreen';
import NotificationScreen from '../screens/NotificationScreen';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import type {RootStackParamList} from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{gestureEnabled: false}}
      />
      <Stack.Screen
        name="AadhaarAuth"
        component={AadhaarAuthScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ApplicationSuccess"
        component={ApplicationSuccessScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="MobileVerification"
        component={MobileVerificationScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="SHGDetails"
        component={SHGDetailsScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AddressDetails"
        component={AddressScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="IncomeDetails"
        component={IncomeDetailsScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="EconomicActivity"
        component={EconomicActivityScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ReviewApplication"
        component={ReviewApplicationScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="Auth"
        component={AuthNavigator}
        options={{gestureEnabled: false}}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{gestureEnabled: false}}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
