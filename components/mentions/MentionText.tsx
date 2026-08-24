import React, { useMemo } from "react";
import {
  Text,
  type TextProps,
  type TextStyle,
  type StyleProp,
} from "react-native";
import type { MentionSpan } from "@/types/types";
import { normalizeMentionSpans } from "@/utils/mentions";
import { resolveMentionUsername } from "@/services/mentionService";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { makeStyles } from "@/theme";
import { runNavigation } from "@/utils/reviewItemMemo";

export default function MentionText({
  text,
  mentions = [],
  style,
  mentionStyle,
  emphasizeMentions = true,
  onNavigate,
  ...textProps
}: Omit<TextProps, "children"> & {
  text: string;
  mentions?: MentionSpan[];
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  emphasizeMentions?: boolean;
  onNavigate?: (navigate: () => void) => void;
}) {
  const styles = useStyles();
  const openProfile = useOpenProfile();
  const valid = useMemo(
    () => normalizeMentionSpans(text, mentions),
    [mentions, text]
  );
  if (!valid.length) {
    return (
      <Text style={style} {...textProps}>
        {text}
      </Text>
    );
  }

  const children: React.ReactNode[] = [];
  let cursor = 0;
  valid.forEach((mention, index) => {
    if (mention.start > cursor) {
      children.push(text.slice(cursor, mention.start));
    }
    children.push(
      <Text
        key={`${mention.profileId}:${mention.start}:${index}`}
        style={[
          emphasizeMentions && styles.mentionStrong,
          styles.mention,
          mentionStyle,
        ]}
        accessibilityRole="link"
        onPress={(event) => {
          event.stopPropagation();
          // The span's username is a snapshot; profile routes resolve by
          // current handle, so look the live one up before navigating.
          void resolveMentionUsername(mention.profileId)
            .catch(() => null)
            .then((username) => {
              runNavigation(
                () =>
                  openProfile(username ?? mention.username, mention.profileId),
                onNavigate
              );
            });
        }}
      >
        {text.slice(mention.start, mention.start + mention.length)}
      </Text>
    );
    cursor = mention.start + mention.length;
  });
  if (cursor < text.length) children.push(text.slice(cursor));

  return (
    <Text style={style} {...textProps}>
      {children}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  mention: {
    color: t.colors.accent,
  },
  mentionStrong: {
    ...t.typography.bodyStrong,
  },
}));
