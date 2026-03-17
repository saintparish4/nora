// Barrel re-export for backward compatibility
// All existing imports from "@/lib/api" will continue to work

export * from "./auth";
export * from "./providers";
export * from "./appointments";
export * from "./symptoms";
export * from "./quick-booking";
export * from "./symptom-chat";
export * from "./hooks";
export * from "./prefetch";

// Re-export types for convenience
export * from "@/types";
