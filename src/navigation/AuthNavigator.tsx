/**
 * AuthNavigator — Authentication flow navigator.
 * Manages:
 * - LoginMethod: Method Selection (Mobile Number vs Application Number) [Image 1]
 * - Login: Mobile Number login flow [Existing Flow]
 * - ApplicationLogin: Application Number login flow + OTP Verification [Image 2 & 3]
 * Navigates to MainTabs upon successful authentication.
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  LoginScreen,
  LoginMethodScreen,
  ApplicationLoginScreen,
} from '../screens/auth';
import type {AuthStackParamList, AuthStackScreenProps} from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const LoginMethodWrapper: React.FC<AuthStackScreenProps<'LoginMethod'>> = ({
  navigation,
}) => {
  return (
    <LoginMethodScreen
      onSelectMobile={() => {
        navigation.navigate('Login');
      }}
      onSelectApplication={() => {
        navigation.navigate('ApplicationLogin');
      }}
      onApplyNow={() => {
        navigation.navigate('AadhaarAuth' as any);
      }}
      onBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('Login');
        }
      }}
    />
  );
};

const LoginWrapper: React.FC<AuthStackScreenProps<'Login'>> = ({
  navigation,
  route,
}) => {
  return (
    <LoginScreen
      initialStep={route.params?.initialStep || 'PHONE'}
      onSuccess={() => {
        navigation.replace('MainTabs', undefined);
      }}
      onNavigateToApplicationLogin={() => {
        navigation.navigate('ApplicationLogin');
      }}
      onBackToOnboarding={
        navigation.canGoBack() ? () => navigation.goBack() : undefined
      }
    />
  );
};

const ApplicationLoginWrapper: React.FC<
  AuthStackScreenProps<'ApplicationLogin'>
> = ({navigation}) => {
  return (
    <ApplicationLoginScreen
      onSuccess={() => {
        navigation.replace('MainTabs', undefined);
      }}
      onChooseAnotherMethod={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('Login');
        }
      }}
      onBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('Login');
        }
      }}
    />
  );
};

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Login" component={LoginWrapper} />
      <Stack.Screen name="LoginMethod" component={LoginMethodWrapper} />
      <Stack.Screen
        name="ApplicationLogin"
        component={ApplicationLoginWrapper}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
