/**
 * AsyncStorage wrapper with typed getter/setter utility functions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Keys ────────────────────────────────────────────
const STORAGE_KEYS = {
  AUTH_TOKEN: '@wemanipur/auth_token',
  REFRESH_TOKEN: '@wemanipur/refresh_token',
  HAS_COMPLETED_ONBOARDING: '@wemanipur/has_completed_onboarding',
  USER_PROFILE: '@wemanipur/user_profile',
  LOAN_ID: '@wemanipur/loan_id',
  LOAN_DETAILS: '@wemanipur/loan_details',
  ASSISTANCE_DATA: '@wemanipur/assistance_data',
} as const;

// ─── Auth Token ──────────────────────────────────────────────
export const setToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (error) {
    console.error('[Storage] Failed to save auth token:', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('[Storage] Failed to get auth token:', error);
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('[Storage] Failed to remove auth token:', error);
  }
};

// ─── Refresh Token ───────────────────────────────────────────
export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.error('[Storage] Failed to save refresh token:', error);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('[Storage] Failed to get refresh token:', error);
    return null;
  }
};

// ─── Onboarding State ────────────────────────────────────────
export const setHasCompletedOnboarding = async (
  value: boolean,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.HAS_COMPLETED_ONBOARDING,
      JSON.stringify(value),
    );
  } catch (error) {
    console.error('[Storage] Failed to save onboarding state:', error);
  }
};

export const getHasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(
      STORAGE_KEYS.HAS_COMPLETED_ONBOARDING,
    );
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('[Storage] Failed to get onboarding state:', error);
    return false;
  }
};

// ─── User Profile ────────────────────────────────────────────
export const setUserProfile = async <T extends object>(
  profile: T,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(profile),
    );
  } catch (error) {
    console.error('[Storage] Failed to save user profile:', error);
  }
};

export const getUserProfile = async <T extends object>(): Promise<T | null> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('[Storage] Failed to get user profile:', error);
    return null;
  }
};

// ─── Loan Storage ────────────────────────────────────────────
export const setLoanId = async (loanId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LOAN_ID, loanId);
  } catch (error) {
    console.error('[Storage] Failed to save loan id:', error);
  }
};

export const getLoanId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LOAN_ID);
  } catch (error) {
    console.error('[Storage] Failed to get loan id:', error);
    return null;
  }
};

export const setStoredLoanDetails = async <T extends object>(
  details: T,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.LOAN_DETAILS,
      JSON.stringify(details),
    );
  } catch (error) {
    console.error('[Storage] Failed to save loan details:', error);
  }
};

export const getStoredLoanDetails = async <T extends object>(): Promise<T | null> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.LOAN_DETAILS);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('[Storage] Failed to get loan details:', error);
    return null;
  }
};

// ─── Assistance Data ─────────────────────────────────────────
export const setStoredAssistanceData = async <T extends object>(
  data: T,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.ASSISTANCE_DATA,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error('[Storage] Failed to save assistance data:', error);
  }
};

export const getStoredAssistanceData = async <T extends object>(): Promise<T | null> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ASSISTANCE_DATA);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('[Storage] Failed to get assistance data:', error);
    return null;
  }
};

// ─── Clear All ───────────────────────────────────────────────
export const clearAll = async (): Promise<void> => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    await AsyncStorage.clear();
  } catch (error) {
    console.error('[Storage] Failed to clear storage:', error);
  }
};
