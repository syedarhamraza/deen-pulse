import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Modal } from 'react-native';
import { styles } from '../../App';

interface FluidAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function FluidAlert({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}: FluidAlertProps): React.JSX.Element | null {
  const [shouldRender, setShouldRender] = useState(visible);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(animValue, {
        toValue: 1,
        damping: 20,
        mass: 0.8,
        stiffness: 130,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [visible, animValue]);

  if (!shouldRender) return null;

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal visible={true} transparent onRequestClose={onCancel || onConfirm} animationType="none">
      <View style={styles.alertOverlay}>
        <Animated.View
          style={[
            styles.alertBackdrop,
            { opacity: backdropOpacity }
          ]}
          pointerEvents="auto"
        />
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          <View style={styles.alertButtonRow}>
            {onCancel && (
              <Pressable
                style={({ pressed }) => [
                  styles.alertButton,
                  styles.alertButtonCancel,
                  { opacity: pressed ? 0.7 : 1.0 }
                ]}
                onPress={onCancel}
              >
                <Text style={styles.alertButtonTextCancel}>{cancelText || 'Cancel'}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.alertButton,
                confirmText === 'RESET' ? styles.alertButtonDestructive : styles.alertButtonConfirm,
                { opacity: pressed ? 0.7 : 1.0 }
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.alertButtonTextConfirm}>{confirmText || 'OK'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
