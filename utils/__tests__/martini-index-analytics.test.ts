import { logMartiniIndexEvent } from "@/utils/martini-index-analytics";
import { supabase } from "@/utils/supabase";

jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

describe("Martini Index analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes an event through the private RPC", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await logMartiniIndexEvent("filter", "Gin");

    expect(supabase.rpc).toHaveBeenCalledWith("log_martini_index_event", {
      p_kind: "filter",
      p_value: "Gin",
    });
  });

  it("sends null when an event has no detail value", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await logMartiniIndexEvent("view");

    expect(supabase.rpc).toHaveBeenCalledWith("log_martini_index_event", {
      p_kind: "view",
      p_value: null,
    });
  });
});
