import { authFetch } from "./client";
import type { SymptomAnalysisResponse } from "@/types";

export async function analyzeSymptoms(
  description: string
): Promise<SymptomAnalysisResponse> {
  const res = await authFetch("/api/v1/analyze-symptoms", {
    method: "POST",
    body: JSON.stringify({ description }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to analyze symptoms");
  }

  return data;
}
