import { SymptomAnalysis } from './symptoms';
import { Provider, TimeSlot } from './appointments';

export interface QuickBookingAnalysisResponse {
  analysis: SymptomAnalysis;
  providers: (Provider & { next_available_slots: TimeSlot[] })[];
  total_providers: number;
}
