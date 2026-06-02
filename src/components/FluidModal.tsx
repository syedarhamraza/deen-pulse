import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles } from '../../App';

interface FluidModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const localStyles = StyleSheet.create({
  overlayLine: {
    height: 1,
    width: '100%',
  },
});

export function ModalFadeOverlay({ position }: { position: 'top' | 'bottom' }) {
  const steps = 24;
  const lines = [];

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const easeOpacity = position === 'top' ? Math.pow(1 - ratio, 1.5) : Math.pow(ratio, 1.5);
    lines.push(easeOpacity.toFixed(3));
  }

  return (
    <View style={position === 'top' ? styles.modalFadeOverlayTop : styles.modalFadeOverlayBottom} pointerEvents="none">
      {lines.map((op, idx) => (
        <View key={idx} style={[localStyles.overlayLine, { backgroundColor: `rgba(17, 24, 39, ${op})` }]} />
      ))}
    </View>
  );
}

export function FluidModal({ visible, onClose, title, children }: FluidModalProps): React.JSX.Element | null {
  const [shouldRender, setShouldRender] = useState(visible);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(animValue, {
        toValue: 1,
        damping: 24,
        mass: 0.9,
        stiffness: 140,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 250,
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

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <Modal visible={true} transparent onRequestClose={onClose} animationType="none">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalBackdrop,
            { opacity: backdropOpacity }
          ]}
          pointerEvents="auto"
        >
          <Pressable style={styles.flex1} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <View style={styles.modalGrabber}>
            <View style={styles.grabberBar} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalCloseBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Icon name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
