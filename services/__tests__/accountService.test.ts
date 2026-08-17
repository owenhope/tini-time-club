import { deleteCurrentAccount } from "@/services/accountService";
import { supabase } from "@/utils/supabase";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
}));

const invoke = supabase.functions.invoke as jest.Mock;

describe("accountService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests authenticated server-side account deletion", async () => {
    invoke.mockResolvedValue({ data: { deleted: true }, error: null });

    await expect(deleteCurrentAccount()).resolves.toBeUndefined();

    expect(invoke).toHaveBeenCalledWith("delete-account", { body: {} });
  });

  it("rejects when the deletion endpoint fails", async () => {
    const error = new Error("deletion failed");
    invoke.mockResolvedValue({ data: null, error });

    await expect(deleteCurrentAccount()).rejects.toBe(error);
  });
});
