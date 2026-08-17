import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { makeStyles, useTheme } from "@/theme";

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
  const styles = useStyles();
  const { colors } = useTheme();
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
      animationType="none"
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
                placeholderTextColor={colors.textMuted}
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

const useStyles = makeStyles((t) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: t.colors.scrim,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    padding: t.spacing.xl - 4,
    borderRadius: t.radius.sheet,
    width: "85%" as const,
    maxHeight: "80%" as const,
    alignItems: "center" as const,
  },
  modalTitle: {
    ...t.typography.heading,
    color: t.colors.text,
    marginBottom: 10,
  },
  optionButton: {
    paddingVertical: t.spacing.sm,
    alignSelf: "stretch" as const,
  },
  optionText: {
    ...t.typography.body,
    textAlign: "center" as const,
    color: t.colors.text,
  },
  cancelButton: { marginTop: 10 },
  cancelText: { ...t.typography.bodyStrong, color: t.colors.accent },
  customInputContainer: {
    width: "100%" as const,
  },
  customInputLabel: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    marginBottom: 10,
    textAlign: "center" as const,
  },
  customInput: {
    ...t.typography.body,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.input,
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: 15,
    color: t.colors.text,
    minHeight: 100,
    textAlignVertical: "top" as const,
    marginBottom: t.spacing.xl - 4,
  },
  customInputButtons: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  submitButton: {
    backgroundColor: t.colors.danger,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.xl - 4,
    borderRadius: t.radius.pill,
    flex: 1,
  },
  submitButtonText: {
    ...t.typography.bodyStrong,
    color: t.colors.onAccent,
    textAlign: "center" as const,
  },
  backButton: {
    backgroundColor: t.colors.surfaceSunken,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.xl - 4,
    borderRadius: t.radius.pill,
    flex: 1,
  },
  backButtonText: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    textAlign: "center" as const,
  },
}));
