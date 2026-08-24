import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";
import { searchMentionCandidates } from "@/services/mentionService";
import type { MentionCandidate, MentionSpan } from "@/types/types";
import {
  findMentionQuery,
  insertMention,
  normalizeMentionSpans,
  reconcileMentionSpans,
  uniqueMentionProfileCount,
} from "@/utils/mentions";
import AnalyticService from "@/services/analyticsService";

const SEARCH_DEBOUNCE_MS = 180;

export const useMentionComposer = ({
  value,
  mentions,
  onChange,
  enabled = true,
}: {
  value: string;
  mentions: MentionSpan[];
  onChange: (value: string, mentions: MentionSpan[]) => void;
  enabled?: boolean;
}) => {
  const [selection, setSelection] = useState({
    start: value.length,
    end: value.length,
  });
  const [results, setResults] = useState<MentionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUnavailable, setSearchUnavailable] = useState(false);
  const suggestionsOpenTracked = useRef(false);
  const query = useMemo(
    () =>
      enabled && selection.start === selection.end
        ? findMentionQuery(value, selection.start, mentions)
        : null,
    [enabled, mentions, selection.end, selection.start, value]
  );

  useEffect(() => {
    if (selection.start <= value.length && selection.end <= value.length)
      return;
    setSelection({ start: value.length, end: value.length });
  }, [selection.end, selection.start, value.length]);

  useEffect(() => {
    if (!query) {
      suggestionsOpenTracked.current = false;
      setResults([]);
      setLoading(false);
      setSearchUnavailable(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSearchUnavailable(false);
    if (!suggestionsOpenTracked.current) {
      suggestionsOpenTracked.current = true;
      void AnalyticService.capture("mention_suggestions_opened");
    }
    const timer = setTimeout(() => {
      void searchMentionCandidates(query.query)
        .then((candidates) => {
          if (!cancelled) setResults(candidates);
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setSearchUnavailable(true);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query?.query, query?.start]);

  const changeText = useCallback(
    (nextValue: string) => {
      onChange(nextValue, reconcileMentionSpans(value, nextValue, mentions));
    },
    [mentions, onChange, value]
  );

  const changeSelection = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setSelection(event.nativeEvent.selection);
    },
    []
  );

  const selectCandidate = useCallback(
    (candidate: MentionCandidate) => {
      if (!query) return;
      const alreadySelected = new Set(
        normalizeMentionSpans(value, mentions).map(
          (mention) => mention.profileId
        )
      );
      if (alreadySelected.size >= 5 && !alreadySelected.has(candidate.id))
        return;
      const next = insertMention({
        text: value,
        spans: mentions,
        query,
        candidate,
      });
      onChange(next.text, next.spans);
      void AnalyticService.capture("mention_selected");
      setSelection({ start: next.cursor, end: next.cursor });
      setResults([]);
    },
    [mentions, onChange, query, value]
  );

  return {
    selection,
    results,
    loading,
    searchUnavailable,
    suggestionsVisible: query !== null,
    query: query?.query ?? "",
    uniqueMentionCount: uniqueMentionProfileCount(mentions),
    changeText,
    changeSelection,
    selectCandidate,
  };
};
