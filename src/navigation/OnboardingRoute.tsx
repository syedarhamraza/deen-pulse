import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { RootStackParamList } from './types';

interface OnboardingRouteProps {
  onComplete: (brand: string) => void;
}

export function OnboardingRoute({ onComplete }: OnboardingRouteProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <OnboardingScreen
      onComplete={(brand) => {
        onComplete(brand);
        navigation.reset({
          index: 0,
          routes: [{ name: 'dashboard' }],
        });
      }}
    />
  );
}
