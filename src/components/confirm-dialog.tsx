import { useState } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Wraps any trigger element with a confirmation step before an irreversible
 * delete actually runs. Used by every admin list and by the Buy & Sell
 * listing owner's "Remove listing" action — nothing in the app deletes a
 * record on a single click.
 */
export function ConfirmDeleteDialog({
  trigger,
  title = "Delete this?",
  description = "This can't be undone.",
  confirmLabel = "Delete",
  onConfirm,
}: {
  trigger: ReactNode;
  title?: string;
  description?: ReactNode;
  /** Text on the destructive button. Defaults to "Delete". */
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async (e) => {
              e.preventDefault();
              setPending(true);
              setError(null);
              try {
                await onConfirm();
                setPending(false);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong.");
                setPending(false);
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
