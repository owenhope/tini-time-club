import React, { useEffect } from "react";
import renderer, { act } from "react-test-renderer";
import { useUsernameCheck, type UsernameCheck } from "@/hooks/useUsernameCheck";
import { isUsernameAvailable } from "@/services/onboardingService";

jest.mock("@/services/onboardingService", () => ({
  isUsernameAvailable: jest.fn(),
}));
jest.mock("bad-words", () => ({
  Filter: jest.fn().mockImplementation(() => ({ isProfane: () => false })),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

const available = jest.mocked(isUsernameAvailable);
let latest: UsernameCheck;

const record = (check: UsernameCheck) => {
  latest = check;
};

function Probe({ value }: { value: string }) {
  const check = useUsernameCheck(value, "current_name", "member-1", 450);
  useEffect(() => record(check), [check]);
  return null;
}

describe("useUsernameCheck", () => {
  let root: renderer.ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    available.mockReset();
  });
  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    jest.useRealTimers();
  });

  const render = (value: string) =>
    act(() => {
      if (root) root.update(<Probe value={value} />);
      else root = renderer.create(<Probe value={value} />);
    });

  it("treats the member's own username as unchanged", () => {
    render("current_name");
    expect(latest).toEqual({ status: "unchanged" });
    expect(available).not.toHaveBeenCalled();
  });

  it("reports format problems without querying", () => {
    render("no spaces");
    expect(latest).toEqual({
      status: "invalid",
      message: "Use only letters, numbers, and underscores",
    });
    act(() => jest.advanceTimersByTime(1000));
    expect(available).not.toHaveBeenCalled();
  });

  it("checks availability after a pause", async () => {
    available.mockResolvedValue(true);
    render("new_name");
    expect(latest).toEqual({ status: "checking" });

    await act(async () => {
      jest.advanceTimersByTime(450);
    });
    expect(available).toHaveBeenCalledTimes(1);
    expect(available).toHaveBeenCalledWith("new_name", "member-1");
    expect(latest).toEqual({ status: "available" });
  });

  it("reports a taken name and only queries the last spelling", async () => {
    available.mockResolvedValue(false);
    render("taken_na");
    act(() => jest.advanceTimersByTime(200));
    render("taken_name");

    await act(async () => {
      jest.advanceTimersByTime(450);
    });
    expect(available).toHaveBeenCalledTimes(1);
    expect(available).toHaveBeenCalledWith("taken_name", "member-1");
    expect(latest).toEqual({ status: "taken" });
  });

  it("returns to checking when the name changes after a result", async () => {
    available.mockResolvedValue(true);
    render("first_try");
    await act(async () => {
      jest.advanceTimersByTime(450);
    });
    render("second_try");
    expect(latest).toEqual({ status: "checking" });
  });
});
