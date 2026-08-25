const mockSetBadgeCountAsync = jest.fn();

jest.mock("expo-notifications", () => ({
  setBadgeCountAsync: (...args: unknown[]) => mockSetBadgeCountAsync(...args),
}));

import { setActivityBadgeCount } from "@/utils/activityBadge";

describe("activity badge", () => {
  beforeEach(() => {
    mockSetBadgeCountAsync.mockReset();
    mockSetBadgeCountAsync.mockResolvedValue(true);
  });

  it("sets the icon badge to the pending activity count", async () => {
    await setActivityBadgeCount(4);

    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(4);
  });

  it("clears the icon badge when activity has been checked", async () => {
    await setActivityBadgeCount(0);

    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);
  });
});
