import { RiskLevel } from '@/types/api';

export interface RiskChecks {
  ofacSanctioned: boolean;
  // Future: add more risk factors
  // indirectExposure?: boolean;
  // highRiskJurisdiction?: boolean;
}

export function assessRiskLevel(checks: RiskChecks): RiskLevel {
  // For MVP, keep it simple: binary classification
  if (checks.ofacSanctioned) {
    return 'high';
  }

  // Future: Add more sophisticated risk scoring
  // if (checks.indirectExposure) {
  //   return 'medium';
  // }

  return 'clear';
}

export function getRiskFlags(checks: RiskChecks): string[] {
  const flags: string[] = [];

  if (checks.ofacSanctioned) {
    flags.push('ofac_sdn_list');
  }

  return flags;
}
