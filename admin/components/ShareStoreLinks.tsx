import AppStoreLink from "@/components/AppStoreLink";
import GooglePlayLink from "@/components/GooglePlayLink";

const linkClass =
  "inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[#1C3A2E] px-4 text-sm font-black text-[#1C3A2E] transition hover:bg-[#1C3A2E] hover:text-[#FAF9F6]";

/** Store links under a shared review or place, for people without the app. */
export default function ShareStoreLinks({ placement }: { placement: string }) {
  return (
    <section
      aria-label="Get the app"
      className="mt-5 rounded-[12px] bg-[#F1EEE7] px-4 py-4 text-center"
    >
      <p className="text-[13px] font-semibold text-[#6E7472]">
        Don&apos;t have Tini Time Club yet?
      </p>
      <div className="mt-3 flex gap-2">
        <AppStoreLink placement={placement} className={linkClass}>
          App Store
        </AppStoreLink>
        <GooglePlayLink
          placement={placement}
          className={linkClass}
          comingSoonClassName="inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-full border border-dashed border-[#6E7472]/60 px-3 text-[13px] font-bold text-[#6E7472]"
        >
          Google Play
        </GooglePlayLink>
      </div>
    </section>
  );
}
