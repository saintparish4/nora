import { authFetch, validateResponse } from "./client";
import { ProvidersResponseSchema, ProviderSchema } from "./schemas";
import type { ProvidersResponse, Provider, AvailableSlotsResponse } from "@/types";

export async function getProviders(params?: {
  specialty?: string;
  location?: string;
  min_rating?: number;
  sort?: string;
  page?: number;
  per_page?: number;
}): Promise<ProvidersResponse> {
  const queryParams = new URLSearchParams();

  if (params?.specialty) queryParams.set("specialty", params.specialty);
  if (params?.location) queryParams.set("location", params.location);
  if (params?.min_rating)
    queryParams.set("rating", params.min_rating.toString());
  if (params?.sort) queryParams.set("sort", params.sort);
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.per_page) queryParams.set("per_page", params.per_page.toString());

  const url = `/api/v1/providers${
    queryParams.toString() ? `?${queryParams}` : ""
  }`;

  const res = await authFetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch providers");
  }

  const data = await res.json();
  return validateResponse(ProvidersResponseSchema, data);
}

export async function getProvider(id: number): Promise<Provider> {
  const res = await authFetch(`/api/v1/providers/${id}`);
  if (!res.ok) throw new Error("Provider not found");
  const data = await res.json();
  return validateResponse(ProviderSchema, data.provider);
}

export async function getAvailableSlots(
  providerId: number
): Promise<AvailableSlotsResponse> {
  const res = await authFetch(
    `/api/v1/providers/${providerId}/available_slots`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch available slots");
  }
  return res.json();
}

export async function getProvidersByAISpecialty(
  specialty: string,
  params?: {
    location?: string;
    min_rating?: number;
    sort?: string;
  }
): Promise<ProvidersResponse> {
  const queryParams = new URLSearchParams();

  // Use ai_specialty parameter for backend filtering
  queryParams.set("ai_specialty", specialty);

  if (params?.location) queryParams.append("location", params.location);
  if (params?.min_rating)
    queryParams.append("min_rating", params.min_rating.toString());
  if (params?.sort) queryParams.append("sort", params.sort);

  const url = `/api/v1/providers?${queryParams}`;

  const res = await authFetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch providers");
  }

  const data = await res.json();
  return validateResponse(ProvidersResponseSchema, data);
}
