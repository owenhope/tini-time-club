import { readFileSync } from "fs";
import { join } from "path";

// The admin app vendors utils/martiniReminders.ts (Vercel builds upload only
// admin/, so it can't import across the repo boundary). This guard turns
// silent drift into a red test: edit one file, copy it over the other.
describe("admin's vendored reminder bank", () => {
  it("is byte-identical to utils/martiniReminders.ts", () => {
    const app = readFileSync(
      join(__dirname, "..", "martiniReminders.ts"),
      "utf8"
    );
    const admin = readFileSync(
      join(__dirname, "..", "..", "admin", "lib", "martiniReminders.ts"),
      "utf8"
    );
    expect(admin).toBe(app);
  });
});
