/**
 * WEmanipur — Women Empowerment Manipur
 * Main Application Entry Point
 */
import React from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './src/navigation';
import {ToastProvider} from './src/components';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ToastProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" />
            <RootNavigator />
          </NavigationContainer>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
