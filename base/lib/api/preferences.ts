import { authFetch, validateResponse } from "./client";
import { CarePreferencesResponseSchema } from "./schemas";
import type { CarePreferences } from "@/types";

/**
 * Care preferences — how the patient wants to be seen (location, time of day,
 * provider gender, languages). Distinct from the email notification toggles,
 * which live on the user record and are updated via updateEmailPreferences.
 */
export async function getCarePreferences(): Promise<CarePreferences> {
  const res = await authFetch("/api/v1/care-preferences");

  if (!res.ok) {
    throw new Error("Failed to fetch care preferences");
  }

  const data = await res.json();
  return validateResponse(CarePreferencesResponseSchema, data).care_preferences;
}

export async function updateCarePreferences(
  preferences: Partial<CarePreferences>
): Promise<CarePreferences> {
  const res = await authFetch("/api/v1/care-preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || data.errors?.join(", ") || "Failed to save care preferences"
    );
  }

  return validateResponse(CarePreferencesResponseSchema, data).care_preferences;
}
