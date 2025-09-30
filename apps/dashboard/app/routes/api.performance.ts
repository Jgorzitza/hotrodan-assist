import { json } from '@remix-run/node';
import { performanceMonitor } from '~/lib/monitoring/performance.server';

/**
 * API endpoint for performance metrics
 */
export const loader = async () => {
  const summary = performanceMonitor.getSummary();

  return json({
    summary,
    timestamp: new Date().toISOString(),
  });
};
