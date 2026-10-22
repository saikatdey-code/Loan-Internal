/**
 * Navigation type definitions for WEmanipur
 */
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';

// ─── Root Stack ──────────────────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  AadhaarAuth:
    | {
        loanId?: string;
        applicationNumber?: string;
        applicationId?: string;
        fromScreen?: string;
        fieldList?: any;
        loanStatus?: string;
      }
    | undefined;
  ApplicationSuccess:
    | {
        loanId?: string;
        applicationNumber?: string;
        applicationDate?: string;
      }
    | undefined;
  MobileVerification:
    | {
        loanId?: string;
        applicationNumber?: string;
        phone?: string;
      }
    | undefined;
  PersonalInfo:
    | {
        loanId?: string;
        applicationNumber?: string;
        verifiedPhone?: string;
        fieldList?: any;
        loanStatus?: string;
        isEdit?: boolean;
        loanDetails?: any;
      }
    | undefined;
  SHGDetails:
    | {
        loanId?: string;
        applicationNumber?: string;
        shgDetails?: any;
        fieldList?: any;
        loanStatus?: string;
        isEdit?: boolean;
        loanDetails?: any;
      }
    | undefined;
  AddressDetails:
    | {
        loanId?: string;
        applicationNumber?: string;
        fieldList?: any;
        loanStatus?: string;
        isEdit?: boolean;
        loanDetails?: any;
      }
    | undefined;
  IncomeDetails:
    | {
        loanId?: string;
        applicationNumber?: string;
        fieldList?: any;
        loanStatus?: string;
        isEdit?: boolean;
        loanDetails?: any;
      }
    | undefined;
  EconomicActivity:
    | {
        loanId?: string;
        applicationNumber?: string;
        fieldList?: any;
        loanStatus?: string;
        isEdit?: boolean;
        loanDetails?: any;
      }
    | undefined;
  ReviewApplication:
    | {
        loanId?: string;
        applicationNumber?: string;
        fieldList?: any;
        loanStatus?: string;
        isEdit?: boolean;
        loanDetails?: any;
      }
    | undefined;
  ApplicationDetails:
    | {
        loanId?: string;
        applicationNumber?: string;
        fieldList?: any;
        loanStatus?: string;
      }
    | undefined;
  Notification: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// ─── Auth Stack ──────────────────────────────────────────────
export type AuthStackParamList = {
  LoginMethod: undefined;
  Login: {initialStep?: 'PHONE' | 'OTP' | 'VERIFYING' | 'SUCCESS'} | undefined;
  ApplicationLogin: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// ─── Main Tab Navigator ─────────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Guidelines: undefined;
  Help: undefined;
  Faq: undefined;
  Contact: undefined;
  Notification?: undefined;
  Schemes?: undefined;
  Status?: undefined;
  Profile?: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// ─── Module Augmentation (for useNavigation typing) ─────────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
