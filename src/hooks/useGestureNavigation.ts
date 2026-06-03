import { useState, useEffect, useRef, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { Screen } from '../../App';

export function useGestureNavigation(initialScreen: Screen = 'dashboard') {
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen);
  const historyStack = useRef<Screen[]>([]);

  const navigateTo = useCallback((screen: Screen) => {
    if (screen === currentScreen) return;
    historyStack.current.push(currentScreen);
    setCurrentScreen(screen);
  }, [currentScreen]);

  const goBack = useCallback(() => {
    if (historyStack.current.length > 0) {
      const prev = historyStack.current.pop();
      if (prev) {
        setCurrentScreen(prev);
        return true;
      }
    }
    return false;
  }, []);

  useEffect(() => {
    const handleBackPress = () => {
      // If we are on dashboard (or onboarding with empty stack), let the default exit occur
      if (currentScreen === 'dashboard' || (currentScreen === 'onboarding' && historyStack.current.length === 0)) {
        return false;
      }

      const success = goBack();
      return success; // Return true to prevent default back action
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [currentScreen, goBack]);

  return {
    currentScreen,
    navigateTo,
    goBack,
  };
}
