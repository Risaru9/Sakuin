import { RefreshCw } from "lucide-react";
import { SakuMascot, StickerButton, StickerChip } from "../../components/saku";
import { requestComposerFocus } from "../quick-composer/composer-bridge";

const EXAMPLES = ["kopi 18rb", "bensin 30rb", "gaji 3jt"];

type BerandaEmptyProps = {
  /** First visit ever (no entries in any month) vs. a quiet month. */
  firstTime: boolean;
  firstName: string | null;
  monthLabel: string;
};

export function BerandaEmpty({ firstTime, firstName, monthLabel }: BerandaEmptyProps) {
  return (
    <div className="flex flex-col items-center px-6 pt-6 text-center">
      <SakuMascot animated mood="wow" size={118} />
      <h2 className="mt-2.5 font-saku-head text-2xl leading-[30px] font-semibold">
        {firstTime
          ? `Halo${firstName ? `, ${firstName}` : ""}! Catatan pertamamu tinggal satu ketikan.`
          : `Belum ada catatan di ${monthLabel}`}
      </h2>
      <p className="mt-2.5 text-[13px] font-extrabold text-saku-muted">
        {firstTime ? "Coba ketuk salah satu:" : "Ketik di kolom bawah, atau ketuk contoh ini:"}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <StickerChip key={example} onClick={() => requestComposerFocus({ text: example })}>
            {example}
          </StickerChip>
        ))}
      </div>
      {firstTime ? (
        <svg aria-hidden="true" className="mt-3 -ml-40 text-saku-ink" height="56" viewBox="0 0 70 70" width="56">
          <path
            d="M60 6 C 30 10, 12 26, 16 58"
            fill="none"
            stroke="currentColor"
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M6 48 L16 62 L26 49"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        </svg>
      ) : null}
    </div>
  );
}

export function BerandaLoadError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="saku-line mx-1 mt-6 flex flex-col items-center rounded-saku-card bg-saku-paper px-5 py-6 text-center shadow-saku-sm">
      <SakuMascot animated mood="worried" size={110} />
      <h2 className="mt-2.5 font-saku-head text-2xl font-semibold">Waduh, catatan gagal dimuat</h2>
      <p className="mt-1.5 text-sm font-bold text-saku-muted">
        Sepertinya koneksi sedang putus-putus. Catatanmu tetap aman.
      </p>
      <StickerButton className="mt-4" fullWidth isLoading={isRetrying} onClick={onRetry}>
        <RefreshCw aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
        Coba lagi
      </StickerButton>
    </div>
  );
}
