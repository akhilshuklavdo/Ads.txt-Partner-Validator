export interface Partner {
  id: string;
  name: string;
  lines: string[]; // First line is primary
}

export type AnalysisStatus = 'all' | 'partial' | 'none';

export interface AnalysisResult {
  partner: Partner;
  status: AnalysisStatus;
  foundLines: string[];
  missingLines: string[];
}
