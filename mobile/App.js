import './src/tasks/locationTask';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }       from 'react-native-safe-area-context';
import { StatusBar }              from 'expo-status-bar';

import AppNavigator              from './src/navigation/AppNavigator';
import { AuthProvider }          from './src/context/AuthContext';
import { NotificationProvider }  from './src/context/NotificationContext';
import { LanguageProvider }      from './src/context/LanguageContext';
import checkApiConnection        from './src/services/healthCheck';
import { setNavigationRef }      from './src/services/api';

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    checkApiConnection();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <StatusBar style="auto" />
              <AppNavigator
                navigationRef={navigationRef}
                onReady={() => setNavigationRef(navigationRef.current)}
              />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}