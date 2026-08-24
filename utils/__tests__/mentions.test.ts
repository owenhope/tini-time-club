import type { MentionCandidate, MentionSpan } from "@/types/types";
import {
  findMentionQuery,
  insertMention,
  mentionPayload,
  normalizeMentionSpans,
  reconcileMentionSpans,
  uniqueMentionProfileCount,
  trimMentionBody,
} from "@/utils/mentions";

const claire: MentionCandidate = {
  id: "claire-id",
  username: "Clairebear",
  name: "Claire",
  avatarUrl: null,
  isVerified: false,
  reviewCount: 4,
  relationship: "mutual",
};

const selected = (start: number): MentionSpan => ({
  profileId: claire.id,
  username: claire.username,
  start,
  length: "@Clairebear".length,
});

describe("mentions", () => {
  it("finds the active @query at the caret", () => {
    expect(findMentionQuery("Hello @clai", 11)).toEqual({
      start: 6,
      end: 11,
      query: "clai",
    });
    expect(findMentionQuery("email@test", 10)).toBeNull();
  });

  it("inserts a selected member and appends a space", () => {
    expect(
      insertMention({
        text: "Hello @clai there",
        spans: [],
        query: { start: 6, end: 11, query: "clai" },
        candidate: claire,
      })
    ).toEqual({
      text: "Hello @Clairebear there",
      spans: [selected(6)],
      cursor: 17,
    });
  });

  it("rebases mentions when text changes before them", () => {
    expect(
      reconcileMentionSpans("Hi @Clairebear", "Hello Hi @Clairebear", [
        selected(3),
      ])
    ).toEqual([selected(9)]);
  });

  it("drops identity when a selected token is edited", () => {
    expect(
      reconcileMentionSpans("Hi @Clairebear", "Hi @Clairebea", [selected(3)])
    ).toEqual([]);
  });

  it("uses UTF-16 offsets so emoji match TextInput selections", () => {
    const text = "🍸 with @Clairebear";
    const start = text.indexOf("@Clairebear");
    expect(start).toBe(8);
    expect(normalizeMentionSpans(text, [selected(start)])).toEqual([
      selected(start),
    ]);
  });

  it("allows repeated occurrences but counts a profile once", () => {
    const text = "@Clairebear and @Clairebear";
    const spans = [selected(0), selected(16)];
    expect(normalizeMentionSpans(text, spans)).toEqual(spans);
    expect(uniqueMentionProfileCount(spans)).toBe(1);
    expect(mentionPayload(text, spans)).toHaveLength(2);
  });

  it("rejects malformed, overlapping, and sixth unique mentions", () => {
    const names = ["one", "two", "three", "four", "five", "six"];
    const text = names.map((name) => `@${name}`).join(" ");
    let cursor = 0;
    const spans = names.map((username, index) => {
      const span = {
        profileId: `id-${index}`,
        username,
        start: cursor,
        length: username.length + 1,
      };
      cursor += username.length + 2;
      return span;
    });
    expect(normalizeMentionSpans(text, spans)).toHaveLength(5);
  });

  it("rebases selected mentions when submission trims whitespace", () => {
    expect(trimMentionBody("  Hi @Clairebear  ", [selected(5)])).toEqual({
      text: "Hi @Clairebear",
      mentions: [selected(3)],
    });
  });
});
