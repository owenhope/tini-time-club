import React from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputScrollEvent,
  type TextInputProps,
  type TextStyle,
  type StyleProp,
} from "react-native";
import MentionSuggestions from "@/components/mentions/MentionSuggestions";
import MentionText from "@/components/mentions/MentionText";
import { useMentionComposer } from "@/hooks/useMentionComposer";
import type { MentionCandidate, MentionSpan } from "@/types/types";
import { makeStyles } from "@/theme";

export interface MentionSuggestionState {
  visible: boolean;
  loading: boolean;
  unavailable: boolean;
  query: string;
  results: MentionCandidate[];
  onSelect: (candidate: MentionCandidate) => void;
}

export default function MentionInput({
  value,
  mentions,
  onChange,
  inputComponent: InputComponent = TextInput,
  inputStyle,
  suggestionsPlacement = "floating",
  onSuggestionsChange,
  ...inputProps
}: Omit<
  TextInputProps,
  | "value"
  | "onChange"
  | "onChangeText"
  | "onSelectionChange"
  | "selection"
  | "style"
> & {
  value: string;
  mentions: MentionSpan[];
  onChange: (value: string, mentions: MentionSpan[]) => void;
  inputComponent?: React.ComponentType<any>;
  inputStyle?: StyleProp<TextStyle>;
  suggestionsPlacement?: "floating" | "external";
  onSuggestionsChange?: (state: MentionSuggestionState) => void;
}) {
  const styles = useStyles();
  const [focused, setFocused] = React.useState(false);
  const [scrollOffset, setScrollOffset] = React.useState({ x: 0, y: 0 });
  const composer = useMentionComposer({
    value,
    mentions,
    onChange,
    enabled: focused,
  });

  React.useEffect(() => {
    if (suggestionsPlacement !== "external" || !onSuggestionsChange) return;

    onSuggestionsChange({
      visible: composer.suggestionsVisible,
      loading: composer.loading,
      unavailable: composer.searchUnavailable,
      query: composer.query,
      results: composer.results,
      onSelect: composer.selectCandidate,
    });
  }, [
    composer.loading,
    composer.query,
    composer.results,
    composer.searchUnavailable,
    composer.selectCandidate,
    composer.suggestionsVisible,
    onSuggestionsChange,
    suggestionsPlacement,
  ]);

  const flattenedInputStyle = StyleSheet.flatten(inputStyle) ?? {};
  const horizontalPadding =
    typeof flattenedInputStyle.paddingHorizontal === "number"
      ? flattenedInputStyle.paddingHorizontal
      : 0;
  const verticalPadding =
    typeof flattenedInputStyle.paddingVertical === "number"
      ? flattenedInputStyle.paddingVertical
      : 0;
  const borderWidth =
    typeof flattenedInputStyle.borderWidth === "number"
      ? flattenedInputStyle.borderWidth
      : 0;
  const mirrorContainerStyle = {
    marginTop: flattenedInputStyle.marginTop,
    marginRight: flattenedInputStyle.marginRight,
    marginBottom: flattenedInputStyle.marginBottom,
    marginLeft: flattenedInputStyle.marginLeft,
    paddingTop:
      (typeof flattenedInputStyle.paddingTop === "number"
        ? flattenedInputStyle.paddingTop
        : verticalPadding) + borderWidth,
    paddingRight:
      (typeof flattenedInputStyle.paddingRight === "number"
        ? flattenedInputStyle.paddingRight
        : horizontalPadding) + borderWidth,
    paddingBottom:
      (typeof flattenedInputStyle.paddingBottom === "number"
        ? flattenedInputStyle.paddingBottom
        : verticalPadding) + borderWidth,
    paddingLeft:
      (typeof flattenedInputStyle.paddingLeft === "number"
        ? flattenedInputStyle.paddingLeft
        : horizontalPadding) + borderWidth,
    justifyContent: inputProps.multiline
      ? ("flex-start" as const)
      : ("center" as const),
  };
  const mirrorTextStyle = {
    transform: [
      {
        translateX: -scrollOffset.x,
      },
      {
        translateY: -scrollOffset.y,
      },
    ],
  } satisfies TextStyle;

  const handleScroll = (event: TextInputScrollEvent) => {
    setScrollOffset(event.nativeEvent.contentOffset);
    inputProps.onScroll?.(event);
  };

  return (
    <View style={styles.composer}>
      {suggestionsPlacement === "floating" ? (
        <View style={styles.suggestions} pointerEvents="box-none">
          <MentionSuggestions
            visible={composer.suggestionsVisible}
            loading={composer.loading}
            unavailable={composer.searchUnavailable}
            query={composer.query}
            results={composer.results}
            onSelect={composer.selectCandidate}
          />
        </View>
      ) : null}
      {mentions.length ? (
        <View
          style={[styles.inputMirror, mirrorContainerStyle]}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <MentionText
            text={value}
            mentions={mentions}
            style={[styles.inputMirrorText, mirrorTextStyle]}
            emphasizeMentions={false}
            mentionStyle={styles.inputMention}
          />
        </View>
      ) : null}
      <InputComponent
        {...inputProps}
        value={value}
        selection={composer.selection}
        onChangeText={composer.changeText}
        onSelectionChange={composer.changeSelection}
        onScroll={handleScroll}
        onFocus={(event: unknown) => {
          setFocused(true);
          inputProps.onFocus?.(event as never);
        }}
        onBlur={(event: unknown) => {
          setFocused(false);
          inputProps.onBlur?.(event as never);
        }}
        style={inputStyle}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  composer: {
    gap: t.spacing.xs,
    position: "relative" as const,
    zIndex: 2,
  },
  suggestions: {
    position: "absolute" as const,
    bottom: "100%" as const,
    left: 0,
    right: 0,
    zIndex: 3,
    marginBottom: t.spacing.xs,
  },
  inputMirror: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
    overflow: "hidden" as const,
  },
  inputMention: {
    color: t.colors.accent,
  },
  inputMirrorText: {
    ...t.typography.input,
    color: "transparent",
  },
}));
