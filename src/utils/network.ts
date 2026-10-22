import {Alert} from 'react-native';

/**
 * Checks whether the mobile device has an active internet connection.
 * Fast check against lightweight endpoints with a 2-second timeout.
 */
export const checkInternetConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      `https://clients3.google.com/generate_204?t=${Date.now()}`,
      {
        method: 'HEAD',
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    return res.status >= 200 && res.status < 400;
  } catch {
    // Fallback: ping application backend host
    try {
      const fallbackCtrl = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackCtrl.abort(), 1500);
      const res2 = await fetch(`https://api.wemanipur.com?t=${Date.now()}`, {
        method: 'HEAD',
        signal: fallbackCtrl.signal,
      });
      clearTimeout(fallbackTimer);
      return Boolean(res2.status);
    } catch {
      return false;
    }
  }
};

/**
 * Displays an alert instructing the user to connect to the internet.
 */
export const showNoInternetAlert = (onRetry?: () => void): void => {
  Alert.alert(
    'Alert',
    'Please connect internet',
    onRetry
      ? [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Retry', onPress: onRetry},
        ]
      : [{text: 'OK'}],
    {cancelable: true},
  );
};
