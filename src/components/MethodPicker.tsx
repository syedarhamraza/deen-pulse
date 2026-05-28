import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { CALCULATION_METHODS } from '../utils/prayerEngine';

interface MethodPickerProps {
  visible: boolean;
  selectedMethod: number;
  onSelect: (methodId: number) => void;
  onClose: () => void;
}

export const MethodPicker: React.FC<MethodPickerProps> = ({ visible, selectedMethod, onSelect, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Calculation Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CALCULATION_METHODS}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.methodItem,
                  selectedMethod === item.id && styles.methodItemSelected,
                ]}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <Text style={[
                  styles.methodText,
                  selectedMethod === item.id && styles.methodTextSelected,
                ]}>{item.name}</Text>
                {selectedMethod === item.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  methodItemSelected: {
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
  },
  methodText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  methodTextSelected: {
    color: '#00C896',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#00C896',
    fontWeight: '700',
    marginLeft: 8,
  },
});
