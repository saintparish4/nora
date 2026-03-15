import { authFetch, validateResponse } from "./client";
import { AppointmentsResponseSchema } from "./schemas";
import type { Appointment, AppointmentsResponse } from "@/types";

export async function bookAppointment(params: {
  provider_id: number;
  start_time: string;
  end_time: string;
  notes?: string;
}): Promise<Appointment> {
  const res = await authFetch("/api/v1/appointments", {
    method: "POST",
    body: JSON.stringify(params),
  });

  // Check if response has content before parsing
  const contentType = res.headers.get("content-type");
  let data;

  if (contentType && contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      throw new Error("Server returned invalid JSON response");
    }
  } else {
    // If not JSON, try to get text for error message
    const text = await res.text();
    data = { error: text || "Server error" };
  }

  if (!res.ok) {
    throw new Error(data.error || "Failed to book appointment");
  }

  return data.appointment || data;
}

export async function getAppointments(): Promise<AppointmentsResponse> {
  const res = await authFetch("/api/v1/appointments");

  if (!res.ok) {
    throw new Error("Failed to fetch appointments");
  }

  const data = await res.json();
  return validateResponse(AppointmentsResponseSchema, data);
}

export async function cancelAppointment(id: number): Promise<Appointment> {
  const res = await authFetch(`/api/v1/appointments/${id}/cancel`, {
    method: "PATCH",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to cancel appointment");
  }

  return data.appointment || data;
}

export async function markAppointmentComplete(
  id: number,
  notes?: string
): Promise<Appointment> {
  const res = await authFetch(
    `/api/v1/provider/appointments/${id}/complete`,
    {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to mark appointment as complete");
  }

  return data;
}

export async function cancelProviderAppointment(
  id: number
): Promise<Appointment> {
  const res = await authFetch(
    `/api/v1/provider/appointments/${id}/cancel`,
    {
      method: "PATCH",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to cancel appointment");
  }

  return data;
}
