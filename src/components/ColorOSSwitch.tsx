import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';

interface ColorOSSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ColorOSSwitch({ value, onValueChange }: ColorOSSwitchProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const handlePress = () => {
    onValueChange(!value);
  };

  const trackColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.1)', '#00E8A2'],
  });

  const thumbTranslate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbTranslate }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    padding: 2,
    position: 'relative',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
});
