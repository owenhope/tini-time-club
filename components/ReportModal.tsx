import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";

interface ReportModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (option: string, customReason?: string) => void;
  options?: string[];
}

export default function ReportModal({
  visible,
  title,
  onClose,
  onSelect,
  options = ["Spam", "Inappropriate", "Harassment", "Other"],
}: ReportModalProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customReason, setCustomReason] = useState("");

  const handleOptionSelect = (option: string) => {
    if (option === "Other") {
      setShowCustomInput(true);
    } else {
      onSelect(option);
      onClose();
    }
  };

  const handleCustomSubmit = () => {
    if (customReason.trim().length === 0) {
      Alert.alert("Error", "Please provide a reason for reporting.");
      return;
    }
    onSelect("Other", customReason.trim());
    setCustomReason("");
    setShowCustomInput(false);
    onClose();
  };

  const handleClose = () => {
    setShowCustomInput(false);
    setCustomReason("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          {!showCustomInput ? (
            <>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.optionButton}
                  onPress={() => handleOptionSelect(option)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView style={styles.customInputContainer}>
              <Text style={styles.customInputLabel}>
                Please describe the issue:
              </Text>
              <TextInput
                style={styles.customInput}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Enter your complaint here..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.customInputButtons}>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleCustomSubmit}
                >
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowCustomInput(false)}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    maxHeight: "80%",
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
  customInputContainer: {
    width: "100%",
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    textAlign: "center",
  },
  customInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  customInputButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  submitButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  backButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
