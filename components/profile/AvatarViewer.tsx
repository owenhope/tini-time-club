import React from "react";
import { Modal, Pressable, useWindowDimensions } from "react-native";
import { MemberAvatar, type AvatarMember } from "@/components/shared";
import { makeStyles } from "@/theme";

interface AvatarViewerProps {
  visible: boolean;
  member?: AvatarMember | null;
  onClose: () => void;
}

const AvatarViewer: React.FC<AvatarViewerProps> = ({
  visible,
  member,
  onClose,
}) => {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const avatarSize = Math.min(220, Math.max(156, width - 112));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close profile photo"
      >
        <Pressable style={styles.stage} onPress={() => {}}>
          <MemberAvatar member={member} size={avatarSize} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.scrimStrong,
    padding: t.spacing.xl,
  },
  stage: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
}));

export default AvatarViewer;
