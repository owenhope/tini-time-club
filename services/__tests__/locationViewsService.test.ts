import { recordLocationView } from "../locationViewsService";

const mockRpc = jest.fn();
jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
const rpc = mockRpc;

beforeEach(() => rpc.mockReset());

it("records an opening using only the location ID and decodes the total", async () => {
  rpc.mockResolvedValue({ data: "1234", error: null });
  expect(await recordLocationView(42)).toBe(1234);
  expect(rpc).toHaveBeenCalledWith("record_location_view", {
    p_location_id: "42",
  });
});

it.each(["google-place-id", "", 0, -1, 1.5])(
  "ignores unsaved location %s",
  async (id) => {
    expect(await recordLocationView(id)).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  }
);

it.each([null, -1, 1.5, {}, "", " ", "invalid", Number.MAX_SAFE_INTEGER + 1])(
  "does not display a fabricated count for %s",
  async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    expect(await recordLocationView(42)).toBeNull();
  }
);

it("contains backend and transport failures", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
  expect(await recordLocationView(42)).toBeNull();
  rpc.mockRejectedValue(new Error("offline"));
  expect(await recordLocationView(42)).toBeNull();
});
