import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Check, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { SakuMascot, type SakuMood } from "../../../components/saku";
import { cn } from "../../../lib/cn";

type AuthScreenProps = {
  /** What Saku says in the speech bubble. */
  greeting: string;
  mood?: SakuMood;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Cream page with Saku's greeting, a title and a form card: Masuk, Daftar, Lupa and Reset. */
export function AuthScreen({ greeting, mood = "happy", title, subtitle, children, footer }: AuthScreenProps) {
  return (
    <main className="min-h-[100dvh] bg-saku-bg px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8 font-saku-body text-saku-ink">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-end gap-2.5">
          <SakuMascot animated mood={mood} size={84} />
          <p className="saku-line-thin relative mb-8 rounded-[18px_18px_18px_6px] bg-saku-paper px-3.5 py-2 text-sm font-extrabold shadow-saku-xs">
            {greeting}
          </p>
        </div>

        <h1 className="mt-3 font-saku-head text-[30px] leading-9 font-semibold">{title}</h1>
        <div className="mt-1 text-sm font-bold text-saku-muted">{subtitle}</div>

        <div className="mt-5">{children}</div>

        {footer ? <div className="mt-6 text-center text-sm font-bold text-saku-muted">{footer}</div> : null}
      </div>
    </main>
  );
}

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  icon: LucideIcon;
};

/** Labelled input with a leading icon; password fields get a show/hide eye. */
export function AuthField({ label, icon: Icon, type = "text", ...props }: AuthFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="mb-1.5 block text-xs font-black tracking-[0.05em] text-saku-muted uppercase" htmlFor={id}>
        {label}
      </label>
      <div className="saku-line flex min-h-[52px] items-center gap-2.5 rounded-saku-control bg-saku-paper pr-1.5 pl-3.5 focus-within:ring-4 focus-within:ring-saku-accent/30">
        <Icon aria-hidden="true" className="size-[18px] shrink-0 text-saku-muted" strokeWidth={2.4} />
        <input
          className="min-w-0 flex-1 bg-transparent py-3 text-base font-extrabold outline-none placeholder:font-bold placeholder:text-saku-muted/70"
          id={id}
          type={isPassword && visible ? "text" : type}
          {...props}
        />
        {isPassword ? (
          <button
            aria-label={visible ? "Sembunyikan password" : "Lihat password"}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-saku-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            {visible ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** "Minimal 8 karakter" and "Ada angka", ticked as the password meets them. */
export function PasswordChecklist({ password, confirm }: { password: string; confirm?: string }) {
  const rules = [
    { label: "Minimal 8 karakter", met: password.length >= 8 },
    { label: "Ada angka", met: /[0-9]/.test(password) },
    ...(confirm !== undefined ? [{ label: "Password sama", met: confirm.length > 0 && confirm === password }] : [])
  ];

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {rules.map((rule) => (
        <li
          className={cn(
            "saku-line-hair inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black",
            rule.met ? "bg-saku-income-soft" : "bg-saku-paper text-saku-muted"
          )}
          key={rule.label}
        >
          <Check aria-hidden="true" className={cn("size-3", !rule.met && "opacity-30")} strokeWidth={3.4} />
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

export function AuthDivider({ children }: { children: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-0 flex-1 border-t-2 border-dashed border-saku-dash" />
      <span className="text-xs font-black text-saku-muted">{children}</span>
      <span className="h-0 flex-1 border-t-2 border-dashed border-saku-dash" />
    </div>
  );
}

const NOTICE_TONES = {
  error: "bg-saku-over-soft text-saku-over-text",
  warn: "bg-saku-coin-soft text-saku-watch-text",
  success: "bg-saku-income-soft text-saku-ink"
} as const;

export function AuthNotice({ tone, children }: { tone: keyof typeof NOTICE_TONES; children: ReactNode }) {
  return (
    <p className={cn("mb-4 rounded-2xl px-3.5 py-2.5 text-sm font-extrabold", NOTICE_TONES[tone])} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
