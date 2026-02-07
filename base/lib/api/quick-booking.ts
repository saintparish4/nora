import { authFetch } from "./client";
import type { QuickBookingAnalysisResponse, Appointment } from "@/types";

export async function quickBookingAnalyze(
  description: string
): Promise<QuickBookingAnalysisResponse> {
  const res = await authFetch("/api/v1/quick-booking/analyze", {
    method: "POST",
    body: JSON.stringify({ description }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to analyze symptoms");
  }

  return data;
}

export async function quickBookingBook(params: {
  provider_id: number;
  start_time: string;
  end_time: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; appointment: Appointment }> {
  const res = await authFetch("/api/v1/quick-booking/book", {
    method: "POST",
    body: JSON.stringify(params),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to book appointment");
  }

  return data;
}
