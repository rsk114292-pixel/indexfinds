export interface TrafficPerformanceRecord {
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits?: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
}

export function roundMetric(value: number, digits = 1): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

export function formatPercent(value: number, digits = 1): string {
  const rounded = roundMetric(value, digits);
  return `${rounded}%`;
}

export function getVisitToOutboundRate(outboundClicks: number, visits: number): number {
  if (!visits) return 0;
  return roundMetric((outboundClicks / visits) * 100);
}

export function getOutboundVisitCount(record: TrafficPerformanceRecord): number {
  return record.outboundVisits ?? record.outboundClicks;
}

export function getTrafficRiskLevel(suspiciousRate: number): 'high' | 'medium' | 'low' {
  if (suspiciousRate >= 30) return 'high';
  if (suspiciousRate >= 10) return 'medium';
  return 'low';
}

export function getTrafficRiskLabel(suspiciousRate: number): string {
  const level = getTrafficRiskLevel(suspiciousRate);

  if (level === 'high') return '重复待复核';
  if (level === 'medium') return '重复待观察';
  return '重复稳定';
}

export function getTrafficRiskColor(suspiciousRate: number): string {
  const level = getTrafficRiskLevel(suspiciousRate);

  if (level === 'high') return 'red';
  if (level === 'medium') return 'orange';
  return 'green';
}

export function getTrafficAction(record: TrafficPerformanceRecord): string {
  const outboundRate = record.outboundRate;
  const effectiveUserRate = record.effectiveUserRate;

  if (record.suspiciousRate >= 30) return '先复核记录';
  const outboundVisits = getOutboundVisitCount(record);

  if (record.count < 10 && record.effectiveUsers === 0 && outboundVisits < 3) {
    return '样本不足';
  }
  if (record.effectiveUsers >= 3 && effectiveUserRate >= 3 && record.count >= 20) {
    return '建议加预算';
  }
  if (record.effectiveUsers >= 1 && effectiveUserRate >= 1) return '继续放量';
  if (record.count >= 20 && record.effectiveUsers === 0 && outboundRate >= 8) {
    return '检查激活链路';
  }
  if (outboundRate >= 5 && outboundVisits >= 3) return '继续收集';
  if (outboundRate < 5 && record.count >= 20) return '检查落地页';
  if (outboundRate < 2 && record.count >= 20) return '建议观察';
  if (outboundVisits >= 3 || record.count >= 10) return '继续收集';
  return '样本不足';
}

export function getTrafficActionColor(action: string): string {
  if (action === '先复核记录') return 'red';
  if (action === '建议加预算') return 'green';
  if (action === '检查激活链路') return 'volcano';
  if (action === '检查落地页') return 'orange';
  if (action === '建议观察') return 'gold';
  if (action === '继续收集') return 'blue';
  return 'default';
}

export function getTrafficOpportunityScore(record: TrafficPerformanceRecord): number {
  const samplePenalty = record.count < 10 ? 50 : record.count < 20 ? 20 : 0;
  const riskPenalty = record.suspiciousRate * 4;

  return (
    record.count * 0.3 +
    getOutboundVisitCount(record) * 5 +
    record.effectiveUsers * 45 +
    record.effectiveUserRate * 18 +
    record.outboundRate * 2 -
    riskPenalty -
    samplePenalty
  );
}
