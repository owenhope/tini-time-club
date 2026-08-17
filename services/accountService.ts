import { supabase } from "@/utils/supabase";

export async function deleteCurrentAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account", {
    body: {},
  });

  if (error) throw error;
}
