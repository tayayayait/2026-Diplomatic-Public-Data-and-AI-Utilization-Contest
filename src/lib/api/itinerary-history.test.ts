import { beforeEach, describe, expect, it, vi } from "vitest";

const query = {
  delete: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
};

const supabaseMock = {
  from: vi.fn(() => query),
};

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
}));

describe("itinerary history API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.delete.mockReturnValue(query);
    query.in.mockResolvedValue({ error: null });
    query.insert.mockReturnValue(query);
    query.update.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { id: "history-1" }, error: null });
    query.single.mockResolvedValue({ data: { id: "history-1" }, error: null });
  });

  it("updates an existing itinerary history record by id", async () => {
    const { updateItineraryHistory } = await import("./itinerary-history");
    const patch = {
      accommodation_location: "Tenjin",
      budget_krw: 1500000,
      days_data: {},
      destination_country: "JP",
      duration_days: 7,
      end_date: "2026-06-08",
      places_data: [],
      start_date: "2026-06-02",
    };

    const result = await updateItineraryHistory("history-1", patch);

    expect(supabaseMock.from).toHaveBeenCalledWith("itinerary_histories");
    expect(query.update).toHaveBeenCalledWith(patch);
    expect(query.eq).toHaveBeenCalledWith("id", "history-1");
    expect(query.select).toHaveBeenCalled();
    expect(query.maybeSingle).toHaveBeenCalled();
    expect(query.single).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "history-1" });
  });

  it("returns null when an itinerary history update finds no matching row", async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { updateItineraryHistory } = await import("./itinerary-history");

    const result = await updateItineraryHistory("missing-history", {
      accommodation_location: "Tenjin",
      budget_krw: 1500000,
      days_data: {},
      destination_country: "JP",
      duration_days: 7,
      end_date: "2026-06-08",
      places_data: [],
      start_date: "2026-06-02",
    });

    expect(query.update).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("id", "missing-history");
    expect(result).toBeNull();
  });

  it("deletes multiple itinerary history records by id", async () => {
    const { deleteItineraryHistories } = await import("./itinerary-history");

    const result = await deleteItineraryHistories(["history-1", "history-2", "history-1"]);

    expect(supabaseMock.from).toHaveBeenCalledWith("itinerary_histories");
    expect(query.delete).toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith("id", ["history-1", "history-2"]);
    expect(result).toBe(true);
  });

  it("skips bulk delete when no history ids are supplied", async () => {
    const { deleteItineraryHistories } = await import("./itinerary-history");

    const result = await deleteItineraryHistories([]);

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(query.delete).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
