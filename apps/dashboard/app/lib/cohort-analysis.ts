import type { CohortData } from "~/components/CohortAnalysis";

export function generateCohortData(months: number = 6): CohortData[] {
  // Mock cohort data generation - in production, this would fetch from analytics APIs
  const cohorts: CohortData[] = [];
  const currentDate = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const cohortDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const cohortMonth = cohortDate.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short" 
    });
    
    // Generate cohort size (decreasing over time)
    const baseSize = 1000 - (i * 50);
    const size = Math.max(200, baseSize + Math.floor(Math.random() * 200));
    
    // Generate retention rates (typically decreasing over time)
    const retention: number[] = [];
    const periods: string[] = [];
    
    for (let period = 0; period <= i; period++) {
      periods.push(`Month ${period}`);
      
      if (period === 0) {
        retention.push(100); // Month 0 is always 100%
      } else {
        // Retention typically decreases over time
        const baseRetention = Math.max(10, 80 - (period * 8));
        const variance = (Math.random() - 0.5) * 20;
        const retentionRate = Math.max(0, Math.min(100, baseRetention + variance));
        retention.push(Math.round(retentionRate * 10) / 10);
      }
    }
    
    cohorts.push({
      cohort: cohortMonth,
      size,
      retention,
      periods,
    });
  }
  
  return cohorts;
}

export function calculateCohortInsights(data: CohortData[]): {
  averageRetention: number;
  bestCohort: CohortData;
  worstCohort: CohortData;
  retentionTrend: "improving" | "declining" | "stable";
} {
  // Calculate average retention across all cohorts
  const allRetentionRates = data.flatMap(cohort => cohort.retention.slice(1)); // Exclude Month 0
  const averageRetention = allRetentionRates.reduce((sum, rate) => sum + rate, 0) / allRetentionRates.length;
  
  // Find best and worst cohorts based on Month 1 retention
  const cohortsWithMonth1 = data.filter(cohort => cohort.retention.length > 1);
  const sortedByMonth1 = [...cohortsWithMonth1].sort((a, b) => b.retention[1] - a.retention[1]);
  const bestCohort = sortedByMonth1[0];
  const worstCohort = sortedByMonth1[sortedByMonth1.length - 1];
  
  // Calculate retention trend by comparing recent vs older cohorts
  const recentCohorts = data.slice(0, 3);
  const olderCohorts = data.slice(-3);
  
  const recentAvg = recentCohorts
    .filter(cohort => cohort.retention.length > 1)
    .reduce((sum, cohort) => sum + cohort.retention[1], 0) / recentCohorts.length;
  
  const olderAvg = olderCohorts
    .filter(cohort => cohort.retention.length > 1)
    .reduce((sum, cohort) => sum + cohort.retention[1], 0) / olderCohorts.length;
  
  const trendDiff = recentAvg - olderAvg;
  const retentionTrend = trendDiff > 5 ? "improving" : trendDiff < -5 ? "declining" : "stable";
  
  return {
    averageRetention: Math.round(averageRetention * 10) / 10,
    bestCohort,
    worstCohort,
    retentionTrend,
  };
}

export function getCohortRetentionRate(cohort: CohortData, period: number): number {
  return cohort.retention[period] || 0;
}

export function getCohortSize(cohort: CohortData): number {
  return cohort.size;
}
