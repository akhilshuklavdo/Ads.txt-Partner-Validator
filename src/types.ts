export interface Partner {
  id: string;
  name: string;
  lines: string[]; // Combined lines for legacy support
  primaryLines?: string[]; // Explicit primary lines (can be multiple)
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

export function getPartnerSecondaryLines(partner: Partner): string[] {
  if (partner.secondaryLines !== undefined) {
    return partner.secondaryLines;
  }
  if (partner.lines && partner.lines.length > 1) {
    return partner.lines.slice(1);
  }
  return [];
}

export function getAllPartnerLines(partner: Partner): string[] {
  const primary = getPartnerPrimaryLines(partner);
  const secondary = getPartnerSecondaryLines(partner);
  return [...primary, ...secondary];
}

export type AnalysisStatus = 'all' | 'partial' | 'any_secondary' | 'none';

export interface AnalysisResult {
  partner: Partner;
  status: AnalysisStatus;
  foundLines: string[];
  missingLines: string[];
}
