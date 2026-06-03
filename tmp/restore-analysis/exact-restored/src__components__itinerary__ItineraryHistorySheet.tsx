import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Trash2, MapPin, Calendar, Clock, DollarSign } from "lucide-react";
import { useState } from "react";

import {
  fetchItineraryHistories,
  deleteItineraryHistories,
  type ItineraryHistoryRecord,
} from "@/lib/api/itinerary-history";
import { useDiploLifeStore } from "@/lib/diplolife/state";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectHistory: (history: ItineraryHistoryRecord) => void;
}

type DeleteTarget = {
  ids: string[];
  mode: "single" | "all";
  title: string;
};

export function ItineraryHistorySheet({ open, onOpenChange, onSelectHistory }: Props) {
  const queryClient = useQueryClient();
  const userProfile = useDiploLifeStore((state) => state.userProfile);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: histories, isLoading } = useQuery({
    queryKey: ["itineraryHistories", userProfile?.id],
    queryFn: () => fetchItineraryHistories(userProfile?.id),
    enabled: open && !!userProfile?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteItineraryHistories(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraryHistories", userProfile?.id] });
      setDeleteTarget(null);
    },
  });

  const handleSelect = (history: ItineraryHistoryRecord) => {
    onSelectHistory(history);
    onOpenChange(false);
  };

  const historyItems = histories ?? [];
  const deleteAllIds = historyItems
    .map((history) => history.id)
    .filter((id): id is string => Boolean(id));
  const hasDeletableHistories = deleteAllIds.length > 0;
  const isDeleting = deleteMutation.isPending;

  const handleConfirmDelete = () => {
    if (!deleteTarget || isDeleting) return;

    deleteMutation.mutate(deleteTarget.ids);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6 pr-8">
          <div className="flex items-start justify-between gap-3 text-left">
            <div className="min-w-0 space-y-2">
              <SheetTitle>???쇱젙 湲곕줉</SheetTitle>
              <SheetDescription>
                ?댁쟾??AI媛 ?앹꽦??留욎땄 ?쇱젙 湲곕줉?낅땲?? ?대┃?섏뿬 ?ㅼ떆 遺덈윭?????덉뒿?덈떎.
              </SheetDescription>
            </div>
            {hasDeletableHistories && (
              <Button
                type="button"
                variant="danger-ghost"
                size="sm"
                className="shrink-0 px-2 text-danger"
                disabled={isDeleting}
                onClick={() =>
                  setDeleteTarget({
                    ids: deleteAllIds,
                    mode: "all",
                    title: `${deleteAllIds.length}媛??쇱젙 湲곕줉`,
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
                紐⑤몢 ??젣
              </Button>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : historyItems.length > 0 ? (
          <div className="space-y-4">
            {historyItems.map((history) => (
              <div
                key={history.id}
                className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => handleSelect(history)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-card-foreground">
                    {history.destination_city || history.destination_country} ?ы뻾
                  </h3>
                  {history.created_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(history.created_at), "yyyy.MM.dd")}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {history.start_date} ~ {history.end_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{history.duration_days}???쇱젙</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{history.budget_krw.toLocaleString()}??/span>
                  </div>
                  {history.accommodation_location && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{history.accommodation_location}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 group-hover:opacity-100"
                  aria-label="?쇱젙 湲곕줉 ??젣"
                  disabled={!history.id || isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!history.id) return;

                    setDeleteTarget({
                      ids: [history.id],
                      mode: "single",
                      title: `${history.destination_city || history.destination_country} ?ы뻾`,
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-8 w-8 opacity-20" />
            <p>??λ맂 ?쇱젙 湲곕줉???놁뒿?덈떎.</p>
          </div>
        )}

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !isDeleting) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTarget?.mode === "all"
                  ? "紐⑤뱺 ?쇱젙 湲곕줉????젣?좉퉴??"
                  : "?쇱젙 湲곕줉????젣?좉퉴??"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.mode === "all"
                  ? `?꾩옱 ?붾㈃??${deleteTarget.title}??紐⑤몢 ??젣?⑸땲?? ??젣 ??蹂듦뎄?????놁뒿?덈떎.`
                  : `"${deleteTarget?.title}" 湲곕줉????젣?⑸땲?? ??젣 ??蹂듦뎄?????놁뒿?덈떎.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>痍⑥냼</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ??젣 以?                  </>
                ) : deleteTarget?.mode === "all" ? (
                  "紐⑤몢 ??젣"
                ) : (
                  "??젣"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
