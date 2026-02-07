import { SymptomAnalysis } from './symptoms';
import { TimeSlot } from './appointments';
import { Provider } from './providers';

export interface QuickBookingAnalysisResponse {
  analysis: SymptomAnalysis;
  providers: (Provider & { next_available_slots: TimeSlot[] })[];
  total_providers: number;
}
