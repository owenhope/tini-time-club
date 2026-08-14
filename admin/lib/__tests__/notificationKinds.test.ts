import {
  formatNotificationSentValue,
  isAnalyticsNotificationKind,
} from "../notificationKinds";

describe("notification analytics kinds", () => {
  it.each([null, undefined, "", "unknown", "admin_message", "test_push"])(
    "excludes non-reportable kind %p",
    (kind) => {
      expect(isAnalyticsNotificationKind(kind)).toBe(false);
    }
  );

  it.each([
    "review_liked",
    "review_commented",
    "user_followed",
    "tini_time_reminder",
  ])("includes system kind %s", (kind) => {
    expect(isAnalyticsNotificationKind(kind)).toBe(true);
  });

  it("describes reminder delivery without implying a server send count", () => {
    expect(formatNotificationSentValue("tini_time_reminder", 0)).toBe(
      "On-device"
    );
    expect(formatNotificationSentValue("review_liked", 4)).toBe(4);
  });
});
