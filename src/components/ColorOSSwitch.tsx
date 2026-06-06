/*
 * Copyright (C) 2026 Syed Arham Raza
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';

interface ColorOSSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ColorOSSwitch({ value, onValueChange }: ColorOSSwitchProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      damping: 15,
      mass: 0.6,
      stiffness: 140,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const handlePress = () => {
    onValueChange(!value);
  };

  const trackColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.1)', '#00F29D'],
  });

  const thumbTranslate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  // Droplet stretching width interpolation
  const thumbWidth = animatedValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [22, 26, 28, 26, 22],
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbWidth,
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
