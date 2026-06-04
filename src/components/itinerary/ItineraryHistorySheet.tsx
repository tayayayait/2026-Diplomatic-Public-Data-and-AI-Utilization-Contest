import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, DollarSign, Loader2, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  deleteItineraryHistories,
  fetchItineraryHistories,
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
    enabled: open && !!userProfile?.id,
    queryFn: () => fetchItineraryHistories(userProfile?.id),
    queryKey: ["itineraryHistories", userProfile?.id],
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteItineraryHistories(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["itineraryHistories", userProfile?.id] });
      setDeleteTarget(null);
    },
  });

  const historyItems = histories ?? [];
  const deleteAllIds = historyItems.map((history) => history.id).filter((id): id is string => Boolean(id));
  const hasDeletableHistories = deleteAllIds.length > 0;
  const isDeleting = deleteMutation.isPending;

  const handleSelect = (history: ItineraryHistoryRecord) => {
    onSelectHistory(history);
    onOpenChange(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || isDeleting) return;
    deleteMutation.mutate(deleteTarget.ids);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6 pr-8">
          <div className="flex items-start justify-between gap-3 text-left">
            <div className="min-w-0 space-y-2">
              <SheetTitle>이전 생성 일정 기록</SheetTitle>
              <SheetDescription>
                AI가 생성한 일정 기록을 확인하고 다시 열어보세요.
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
                    title: `총 ${deleteAllIds.length}개의 일정 기록`,
                  })
                }
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                모두 삭제
              </Button>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : historyItems.length > 0 ? (
          <div className="space-y-4">
            {historyItems.map((history) => {
              const title = `${history.destination_city || history.destination_country} trip`;

              return (
                <div
                  key={history.id}
                  className="group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                  onClick={() => handleSelect(history)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-card-foreground">{title}</h3>
                    {history.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(history.created_at), "yyyy.MM.dd")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {history.start_date} - {history.end_date}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{history.duration_days}일</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{history.budget_krw.toLocaleString("ko-KR")} KRW</span>
                    </div>
                    {history.accommodation_location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{history.accommodation_location}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 group-hover:opacity-100"
                    aria-label="일정 기록 삭제"
                    disabled={!history.id || isDeleting}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!history.id) return;

                      setDeleteTarget({
                        ids: [history.id],
                        mode: "single",
                        title,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-8 w-8 opacity-20" aria-hidden="true" />
            <p>저장된 일정 기록이 없습니다.</p>
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
                  ? "모든 일정 기록을 삭제하시겠습니까?"
                  : "일정 기록을 삭제하시겠습니까?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.mode === "all"
                  ? `${deleteTarget.title} 항목이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
                  : `"${deleteTarget?.title}" 항목이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    삭제 중
                  </>
                ) : deleteTarget?.mode === "all" ? (
                  "모두 삭제"
                ) : (
                  "삭제"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
