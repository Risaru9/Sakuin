import { SakuSnackbar } from "./saku-snackbar";
import { dismissSnack, useSakuSnack } from "./snack-store";

/** Renders the current app-wide Saku message, if any. */
export function SakuSnackHost({ className }: { className?: string }) {
  const snack = useSakuSnack();

  if (!snack) {
    return null;
  }

  const { onAction } = snack;

  return (
    <SakuSnackbar
      actionLabel={snack.actionLabel}
      className={className}
      detail={snack.detail}
      key={snack.id}
      mood={snack.mood}
      onAction={
        onAction
          ? () => {
              dismissSnack(snack.id);
              onAction();
            }
          : undefined
      }
      title={snack.title}
    />
  );
}
