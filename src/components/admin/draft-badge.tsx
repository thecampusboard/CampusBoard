import { FileSpreadsheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** Shown next to a row created via bulk Excel import that hasn't been opened/saved in the edit dialog yet — it isn't visible on the public site until then. */
export function DraftBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-400/60 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <FileSpreadsheet className="size-3" aria-hidden="true" />
      Draft
    </Badge>
  );
}
