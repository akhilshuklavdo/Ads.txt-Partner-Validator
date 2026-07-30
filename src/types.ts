export interface Partner {
  id: string;
  name: string;
  lines: string[]; // All lines for the partner
  primaryLines?: string[]; // Explicit primary/core lines
  ortbLines?: string[]; // Explicit ORTB lines
  secondaryLines?: string[]; // Explicit secondary lines
}

export function getPartnerPrimaryLines(partner: Partner): string[] {
  if (partner.primaryLines && partner.primaryLines.length > 0) {
    return partner.primaryLines;
  }
  if (partner.lines && partner.lines.length > 0) {
    return [partner.lines[0]];
  }
  return [];
}

export function getPartnerOrtbLines(partner: Partner): string[] {
  if (partner.ortbLines && partner.ortbLines.length > 0) {
    return partner.ortbLines;
  }
  return [];
}

export function getAllPartnerLines(partner: Partner): string[] {
  const primary = partner.primaryLines || [];
  const ortb = partner.ortbLines || [];
  const secondary = partner.secondaryLines || [];
  const general = partner.lines || [];

  const map = new Map<string, string>();
  [...primary, ...ortb, ...secondary, ...general].forEach(l => {
    const key = l.trim().toLowerCase();
    if (key && !map.has(key)) map.set(key, l.trim());
  });
  return Array.from(map.values());
}

export function getPartnerSecondaryLines(partner: Partner): string[] {
  const primarySet = new Set(getPartnerPrimaryLines(partner).map(l => l.trim().toLowerCase()));
  const ortbSet = new Set(getPartnerOrtbLines(partner).map(l => l.trim().toLowerCase()));
  const all = getAllPartnerLines(partner);
  return all.filter(l => {
    const key = l.trim().toLowerCase();
    return !primarySet.has(key) && !ortbSet.has(key);
  });
}

export type AnalysisStatus = 'all' | 'partial' | 'any_secondary' | 'none';

export interface AnalysisResult {
  partner: Partner;
  status: AnalysisStatus;
  foundLines: string[];
  missingLines: string[];
  missingPrimaryLines?: string[];
  missingOrtbLines?: string[];
  missingPrimaryAndOrtbLines?: string[];
  missingSecondaryLines?: string[];
}

export interface HistoryItem {
  id: string;
  websiteUrl: string;
  adsTxtContent: string;
  timestamp: number;
  results: AnalysisResult[];
}
