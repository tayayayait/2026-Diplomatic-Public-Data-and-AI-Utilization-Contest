import { supabase } from "@/lib/supabase";
import type { ItineraryPlace } from "@/lib/gemini/schema";
import type { ItineraryDay } from "@/store/itineraryStore";

export interface ItineraryHistoryRecord {
  id?: string;
  user_id?: string;
  destination_country: string;
  destination_city?: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  budget_krw: number;
  accommodation_location?: string;
  places_data: ItineraryPlace[];
  days_data: Record<number, ItineraryDay>;
  created_at?: string;
}

export async function fetchItineraryHistories(userId?: string) {
  let query = supabase
    .from("itinerary_histories")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching itinerary histories:", error);
    throw error;
  }

  return data as ItineraryHistoryRecord[];
}

export async function saveItineraryHistory(
  record: Omit<ItineraryHistoryRecord, "id" | "created_at">,
) {
  const { data, error } = await supabase
    .from("itinerary_histories")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("Error saving itinerary history:", error);
    throw error;
  }

  return data as ItineraryHistoryRecord;
}

export async function updateItineraryHistory(
  id: string,
  record: Omit<ItineraryHistoryRecord, "id" | "created_at">,
) {
  const { data, error } = await supabase
    .from("itinerary_histories")
    .update(record)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating itinerary history:", error);
    throw error;
  }

  return data as ItineraryHistoryRecord | null;
}

export async function deleteItineraryHistory(id: string) {
  const { error } = await supabase.from("itinerary_histories").delete().eq("id", id);

  if (error) {
    console.error("Error deleting itinerary history:", error);
    throw error;
  }

  return true;
}

export async function deleteItineraryHistories(ids: string[]) {
  const deleteIds = [...new Set(ids.filter(Boolean))];

  if (deleteIds.length === 0) {
    return true;
  }

  const { error } = await supabase.from("itinerary_histories").delete().in("id", deleteIds);

  if (error) {
    console.error("Error deleting itinerary histories:", error);
    throw error;
  }

  return true;
}
