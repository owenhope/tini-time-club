import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface ReportModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (option: string) => void;
  options?: string[];
}

export default function ReportModal({
  visible,
  title,
  onClose,
  onSelect,
  options = ["Spam", "Inappropriate", "Harassment", "Other"],
}: ReportModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.optionButton}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  optionButton: {
    paddingVertical: 8,
    alignSelf: "stretch",
  },
  optionText: { textAlign: "center", fontSize: 16 },
  cancelButton: { marginTop: 10 },
  cancelText: { color: "#007AFF", fontSize: 16 },
});
