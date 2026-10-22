import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {Colors} from '../constants/colors';
import {Typography} from '../constants/typography';
import {Layout} from '../constants/layout';

// Safe dynamic require for react-native-webview so missing native module doesn't crash
let WebViewComponent: any = null;
try {
  const rnc = require('react-native-webview');
  WebViewComponent = rnc.WebView || rnc.default || rnc;
} catch (_e) {
  WebViewComponent = null;
}

interface DigiLockerModalProps {
  visible: boolean;
  url: string;
  onClose: () => void;
  onSuccess: (finalUrl?: string) => void;
}

export const DigiLockerModal: React.FC<DigiLockerModalProps> = ({
  visible,
  url,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  // Ensure top header clears Dynamic Island (iPhone 14-17 Pro: ~59pt) and notch (~47pt) with comfortable breathing room
  const topInset =
    Math.max(
      insets.top,
      Platform.OS === 'ios' ? 58 : StatusBar.currentHeight || 24,
    ) + (Platform.OS === 'ios' ? 6 : 4);
  // Ensure bottom toolbar clears home indicator (~34pt) comfortably
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 24 : 12,
  );

  const webViewRef = useRef<any>(null);
  const lastUrlRef = useRef<string>(url);
  const hasTriggeredSuccessRef = useRef<boolean>(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    lastUrlRef.current = url;
    hasTriggeredSuccessRef.current = false;
  }, [url]);

  const handleClose = () => {
    Alert.alert(
      'Exit Aadhaar Verification?',
      'If you exit now, your Aadhaar verification will not be completed.',
      [
        {text: 'Continue Verification', style: 'cancel'},
        {
          text: 'Exit',
          style: 'destructive',
          onPress: onClose,
        },
      ],
    );
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);

    if (navState.url) {
      lastUrlRef.current = navState.url;
    }

    const currentUrl = (navState.url || '').toLowerCase();
    const hasUuid =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
        navState.url || '',
      );

    // Check if DigiLocker completed and redirected back to callback
    // (e.g., success=true / success=True, or /application, or /aadhaar-details)
    const isSuccessRedirect =
      currentUrl.includes('success=true') ||
      currentUrl.includes('already-submited-alert') ||
      (currentUrl.includes('wemanipur.com') &&
        (currentUrl.includes('/application') ||
          currentUrl.includes('/dashboard') ||
          currentUrl.includes('/details') ||
          currentUrl.includes('/unauth') ||
          hasUuid));

    if (isSuccessRedirect && !hasTriggeredSuccessRef.current) {
      hasTriggeredSuccessRef.current = true;
      onSuccess(navState.url);
    }
  };

  if (!url) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        <StatusBar barStyle="dark-content" />

        {/* In-App Browser Header with Safe Area Top Inset */}
        <View style={[styles.headerContainer, {paddingTop: topInset}]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleClose}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#0F172A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View style={styles.lockRow}>
                {/* Green Padlock Shield */}
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                    fill="#ECFDF5"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 12L11 14L15 10"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.headerTitle}>DigiLocker Verification</Text>
              </View>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                dg.setu.co • Official Partner
              </Text>
            </View>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => webViewRef.current?.reload()}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 12A9 9 0 1 1 12 3C15.2 3 18 4.7 19.6 7.3L21 9"
                  stroke="#0F172A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M21 3V9H15"
                  stroke="#0F172A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Loading Progress Bar */}
          {isLoading && progress < 1 && (
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {width: `${Math.max(progress * 100, 10)}%`},
                ]}
              />
            </View>
          )}
        </View>

        {/* In-App WebView or Fallback */}
        <View style={styles.webViewContainer}>
          {WebViewComponent ? (
            <WebViewComponent
              ref={webViewRef}
              source={{uri: url}}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              originWhitelist={['*']}
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              userAgent={
                Platform.OS === 'ios'
                  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                  : undefined
              }
              startInLoadingState={true}
              onLoadProgress={(e: any) => {
                setProgress(e?.nativeEvent?.progress ?? 0);
              }}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onNavigationStateChange={handleNavigationStateChange}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>
                    Connecting to DigiLocker...
                  </Text>
                  <Text style={styles.loadingSubtext}>
                    Please do not close or refresh this window.
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.fallbackContainer}>
              <View style={styles.fallbackIconBadge}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
                    fill="#ECFDF5"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 12L11 14L15 10"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={styles.fallbackTitle}>DigiLocker Portal</Text>
              <Text style={styles.fallbackDescription}>
                Authenticate your Aadhaar details on the secure DigiLocker portal.
              </Text>

              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => Linking.openURL(url)}>
                <Text style={styles.primaryActionText}>
                  Open DigiLocker Link
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successActionButton}
                onPress={() => onSuccess(lastUrlRef.current)}>
                <Text style={styles.successActionText}>
                  I've Completed Verification →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Navigation Toolbar */}
        <View style={[styles.toolbarContainer, {paddingBottom: bottomInset}]}>
          <View style={styles.toolbarContent}>
            <TouchableOpacity
              style={[styles.toolbarButton, !canGoBack && styles.toolbarButtonDisabled]}
              disabled={!canGoBack}
              onPress={() => webViewRef.current?.goBack()}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 19L8 12L15 5"
                  stroke={canGoBack ? '#0F172A' : '#94A3B8'}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarButton, !canGoForward && styles.toolbarButtonDisabled]}
              disabled={!canGoForward}
              onPress={() => webViewRef.current?.goForward()}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 5L16 12L9 19"
                  stroke={canGoForward ? '#0F172A' : '#94A3B8'}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: Colors.primary,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  toolbarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toolbarContent: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toolbarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#F8FAFC',
  },
  toolbarButtonDisabled: {
    opacity: 0.35,
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  fallbackIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryActionButton: {
    width: '100%',
    height: 50,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryActionText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '700',
  },
  successActionButton: {
    width: '100%',
    height: 50,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DigiLockerModal;
