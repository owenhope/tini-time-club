import type { MentionCandidate, MentionSpan } from "@/types/types";

export const MAX_MENTIONS_PER_BODY = 5;
/** The v2 RPCs reject payloads above this; never send one that would fail. */
export const MAX_MENTION_SPANS_PER_BODY = 25;
export const MAX_MENTION_BODY_LENGTH = 500;

export interface MentionQuery {
  start: number;
  end: number;
  query: string;
}

const tokenFor = (mention: Pick<MentionSpan, "username">) =>
  `@${mention.username}`;

const overlaps = (
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number
) => leftStart < rightEnd && rightStart < leftEnd;

export const normalizeMentionSpans = (
  text: string,
  spans: readonly MentionSpan[],
  maxUnique = MAX_MENTIONS_PER_BODY
): MentionSpan[] => {
  const uniqueProfiles = new Set<string>();
  const accepted: MentionSpan[] = [];

  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    if (accepted.length >= MAX_MENTION_SPANS_PER_BODY) break;
    const token = tokenFor(span);
    if (
      !span.profileId ||
      !span.username ||
      span.start < 0 ||
      span.length !== token.length ||
      text.slice(span.start, span.start + span.length) !== token ||
      // '@bobs' is not a mention of '@bob': the token must end at a word
      // boundary, so trailing username characters turn the span back to text.
      /^[A-Za-z0-9_]/.test(text.slice(span.start + span.length)) ||
      accepted.some((item) =>
        overlaps(
          item.start,
          item.start + item.length,
          span.start,
          span.start + span.length
        )
      )
    ) {
      continue;
    }

    if (!uniqueProfiles.has(span.profileId)) {
      if (uniqueProfiles.size >= maxUnique) continue;
      uniqueProfiles.add(span.profileId);
    }
    accepted.push({ ...span });
  }

  return accepted;
};

/** Rebase stable mention ranges over the single edit emitted by TextInput.
 * Any edit touching a selected token deliberately turns it back into text. */
export const reconcileMentionSpans = (
  previousText: string,
  nextText: string,
  spans: readonly MentionSpan[]
): MentionSpan[] => {
  if (previousText === nextText) {
    return normalizeMentionSpans(nextText, spans);
  }

  let prefixLength = 0;
  const sharedLength = Math.min(previousText.length, nextText.length);
  while (
    prefixLength < sharedLength &&
    previousText[prefixLength] === nextText[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < sharedLength - prefixLength &&
    previousText[previousText.length - 1 - suffixLength] ===
      nextText[nextText.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const previousEditEnd = previousText.length - suffixLength;
  const nextEditEnd = nextText.length - suffixLength;
  const delta = nextEditEnd - previousEditEnd;

  return normalizeMentionSpans(
    nextText,
    spans.flatMap((span) => {
      const spanEnd = span.start + span.length;
      if (spanEnd <= prefixLength) return [span];
      if (span.start >= previousEditEnd) {
        return [{ ...span, start: span.start + delta }];
      }
      return [];
    })
  );
};

export const findMentionQuery = (
  text: string,
  cursor: number,
  spans: readonly MentionSpan[] = []
): MentionQuery | null => {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  if (
    spans.some(
      (span) =>
        safeCursor > span.start && safeCursor <= span.start + span.length
    )
  ) {
    return null;
  }

  const prefix = text.slice(0, safeCursor);
  const match = prefix.match(/(^|[\s([{"'])@([A-Za-z0-9_]*)$/);
  if (!match || match.index == null) return null;
  const boundaryLength = match[1].length;
  return {
    start: match.index + boundaryLength,
    end: safeCursor,
    query: match[2],
  };
};

export const insertMention = ({
  text,
  spans,
  query,
  candidate,
}: {
  text: string;
  spans: readonly MentionSpan[];
  query: MentionQuery;
  candidate: MentionCandidate;
}): { text: string; spans: MentionSpan[]; cursor: number } => {
  const token = `@${candidate.username}`;
  const suffix = text.slice(query.end).startsWith(" ") ? "" : " ";
  const replacement = `${token}${suffix}`;
  const nextText = `${text.slice(0, query.start)}${replacement}${text.slice(
    query.end
  )}`;
  const removedLength = query.end - query.start;
  const delta = replacement.length - removedLength;
  const rebased = spans.flatMap((span) => {
    const spanEnd = span.start + span.length;
    if (spanEnd <= query.start) return [span];
    if (span.start >= query.end) {
      return [{ ...span, start: span.start + delta }];
    }
    return [];
  });
  rebased.push({
    profileId: candidate.id,
    username: candidate.username,
    start: query.start,
    length: token.length,
  });

  return {
    text: nextText,
    spans: normalizeMentionSpans(nextText, rebased),
    cursor: query.start + replacement.length,
  };
};

export const uniqueMentionProfileCount = (spans: readonly MentionSpan[]) =>
  new Set(spans.map((span) => span.profileId)).size;

export const mentionPayload = (text: string, spans: readonly MentionSpan[]) =>
  normalizeMentionSpans(text, spans).map((span) => ({
    profile_id: span.profileId,
    username: span.username,
    start: span.start,
    length: span.length,
  }));

export const trimMentionBody = (
  text: string,
  spans: readonly MentionSpan[]
): { text: string; mentions: MentionSpan[] } => {
  const leadingWhitespace = text.length - text.trimStart().length;
  const trimmed = text.trim();
  return {
    text: trimmed,
    mentions: normalizeMentionSpans(
      trimmed,
      spans.map((span) => ({ ...span, start: span.start - leadingWhitespace }))
    ),
  };
};
