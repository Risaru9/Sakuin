import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import { SakuMascot } from "./saku-mascot";

/** Saku's visible invitation to open the existing chat room. */
export function SakuChatInvite({ className }: { className?: string }) {
  return (
    <Link
      aria-label="Tanya Saku, buka ruang chat"
      className={cn(
        "group saku-press flex w-[104px] shrink-0 flex-col items-center rounded-2xl text-saku-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-coin",
        className
      )}
      to="/asisten"
    >
      <SakuMascot animated className="motion-safe:transition-transform motion-safe:group-hover:scale-110" size={68} />
      <span className="saku-line-thin relative -mt-1 rounded-[14px_14px_14px_5px] bg-saku-paper px-2 py-1 text-center font-saku-head text-xs font-semibold leading-tight shadow-saku-xs">
        Ayo tanya aku
      </span>
    </Link>
  );
}
