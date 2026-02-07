export interface SymptomAnalysis {
  specialty: string;
  urgency: string;
  reasoning: string;
  keywords: string[];
  red_flags: string[];
  specialty_name: string;
  urgency_details: {
    priority: number;
    color: string;
    message: string;
  };
}

export interface SymptomAnalysisResponse {
  analysis: SymptomAnalysis;
  timestamp: string;
}
