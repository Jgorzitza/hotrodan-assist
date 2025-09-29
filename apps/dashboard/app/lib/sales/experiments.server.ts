import type { SalesDataset, SalesProductPerformance } from "~/types/dashboard";

/**
 * Experiment suggestion algorithms for cross-sell/upsell and landing page tests
 * 
 * This module provides intelligent suggestions for A/B tests and experiments
 * based on sales data analysis.
 */

export type ExperimentType = 
  | "cross_sell" 
  | "upsell" 
  | "landing_page" 
  | "checkout_optimization" 
  | "product_page" 
  | "pricing";

export type ExperimentSuggestion = {
  id: string;
  type: ExperimentType;
  title: string;
  description: string;
  hypothesis: string;
  successMetrics: string[];
  expectedImpact: {
    revenue: number;
    conversion: number;
    confidence: "low" | "medium" | "high";
  };
  effort: "low" | "medium" | "high";
  duration: string; // e.g., "2 weeks", "1 month"
  setup: string[];
  variants: ExperimentVariant[];
  targetAudience: string;
  priority: number; // 1-10 scale
};

export type ExperimentVariant = {
  name: string;
  description: string;
  trafficAllocation: number; // percentage
  changes: string[];
};

export type ExperimentAnalysis = {
  crossSellExperiments: ExperimentSuggestion[];
  upsellExperiments: ExperimentSuggestion[];
  landingPageExperiments: ExperimentSuggestion[];
  checkoutExperiments: ExperimentSuggestion[];
  productPageExperiments: ExperimentSuggestion[];
  pricingExperiments: ExperimentSuggestion[];
  prioritized: ExperimentSuggestion[];
};

/**
 * Analyzes sales data and generates experiment suggestions
 */
export function generateExperimentSuggestions(dataset: SalesDataset): ExperimentAnalysis {
  const crossSellExperiments = generateCrossSellExperiments(dataset);
  const upsellExperiments = generateUpsellExperiments(dataset);
  const landingPageExperiments = generateLandingPageExperiments(dataset);
  const checkoutExperiments = generateCheckoutExperiments(dataset);
  const productPageExperiments = generateProductPageExperiments(dataset);
  const pricingExperiments = generatePricingExperiments(dataset);
  
  const allExperiments = [
    ...crossSellExperiments,
    ...upsellExperiments,
    ...landingPageExperiments,
    ...checkoutExperiments,
    ...productPageExperiments,
    ...pricingExperiments,
  ];
  
  // Sort by priority score
  const prioritized = allExperiments.sort((a, b) => b.priority - a.priority);
  
  return {
    crossSellExperiments,
    upsellExperiments,
    landingPageExperiments,
    checkoutExperiments,
    productPageExperiments,
    pricingExperiments,
    prioritized,
  };
}

/**
 * Generates cross-sell experiment suggestions
 */
function generateCrossSellExperiments(dataset: SalesDataset): ExperimentSuggestion[] {
  const experiments: ExperimentSuggestion[] = [];
  
  // Analyze attach rate insights for cross-sell opportunities
  dataset.attachRateInsights.forEach((insight, index) => {
    if (insight.attachRate < 15) { // Low attach rate indicates opportunity
      experiments.push({
        id: `cross-sell-${index + 1}`,
        type: "cross_sell",
        title: `Bundle ${insight.primaryProduct} with ${insight.attachmentProduct}`,
        description: `Test bundling ${insight.primaryProduct} with ${insight.attachmentProduct} to increase attach rate`,
        hypothesis: `Bundling these products will increase attach rate from ${insight.attachRate}% to 25%+`,
        successMetrics: ["Attach Rate", "Average Order Value", "Revenue per Customer"],
        expectedImpact: {
          revenue: calculateExpectedRevenue(dataset, insight.attachRate, 25),
          conversion: 15,
          confidence: "medium",
        },
        effort: "low",
        duration: "2 weeks",
        setup: [
          "Create product bundle",
          "Set up conditional logic for bundle display",
          "Configure tracking for bundle vs individual sales"
        ],
        variants: [
          {
            name: "Control",
            description: "Show products separately",
            trafficAllocation: 50,
            changes: ["No changes to current experience"]
          },
          {
            name: "Bundle",
            description: "Show bundled products with discount",
            trafficAllocation: 50,
            changes: [
              "Display products as bundle",
              "Show bundle discount",
              "Single add-to-cart for bundle"
            ]
          }
        ],
        targetAudience: "Customers viewing either product",
        priority: calculatePriority("cross_sell", insight.attachRate, 25),
      });
    }
  });
  
  return experiments;
}

/**
 * Generates upsell experiment suggestions
 */
function generateUpsellExperiments(dataset: SalesDataset): ExperimentSuggestion[] {
  const experiments: ExperimentSuggestion[] = [];
  
  // Find products with high attach rates that could be upsold
  const highAttachProducts = dataset.bestSellers.filter(product => product.attachRate > 15);
  
  highAttachProducts.forEach((product, index) => {
    if (product.inventoryStatus === "healthy") {
      experiments.push({
        id: `upsell-${index + 1}`,
        type: "upsell",
        title: `Premium version of ${product.title}`,
        description: `Test offering a premium/higher-tier version of ${product.title}`,
        hypothesis: `Offering a premium version will increase average order value by 20%`,
        successMetrics: ["Average Order Value", "Revenue per Customer", "Conversion Rate"],
        expectedImpact: {
          revenue: calculateUpsellRevenue(dataset, product),
          conversion: 8,
          confidence: "medium",
        },
        effort: "medium",
        duration: "3 weeks",
        setup: [
          "Create premium product variant",
          "Set up upsell flow in checkout",
          "Configure pricing strategy"
        ],
        variants: [
          {
            name: "Control",
            description: "Standard product only",
            trafficAllocation: 50,
            changes: ["No upsell offer"]
          },
          {
            name: "Upsell",
            description: "Offer premium version during checkout",
            trafficAllocation: 50,
            changes: [
              "Show premium option in checkout",
              "Highlight premium benefits",
              "Offer limited-time discount"
            ]
          }
        ],
        targetAudience: "Customers adding standard product to cart",
        priority: calculatePriority("upsell", product.attachRate, 20),
      });
    }
  });
  
  return experiments;
}

/**
 * Generates landing page experiment suggestions
 */
function generateLandingPageExperiments(dataset: SalesDataset): ExperimentSuggestion[] {
  const experiments: ExperimentSuggestion[] = [];
  
  // Analyze conversion rates to identify landing page opportunities
  const lowConversionCollections = dataset.collections.filter(collection => 
    collection.conversionRate < 2.5
  );
  
  lowConversionCollections.forEach((collection, index) => {
    experiments.push({
      id: `landing-page-${index + 1}`,
      type: "landing_page",
      title: `Optimize ${collection.title} landing page`,
      description: `Test different layouts and messaging for ${collection.title} collection page`,
      hypothesis: `Improved landing page will increase conversion rate from ${collection.conversionRate}% to 3.5%+`,
      successMetrics: ["Conversion Rate", "Time on Page", "Bounce Rate", "Add to Cart Rate"],
      expectedImpact: {
        revenue: calculateLandingPageRevenue(dataset, collection),
        conversion: 40,
        confidence: "high",
      },
      effort: "medium",
      duration: "2 weeks",
      setup: [
        "Create alternative landing page layout",
        "Set up A/B testing framework",
        "Configure conversion tracking"
      ],
      variants: [
        {
          name: "Control",
          description: "Current landing page",
          trafficAllocation: 50,
          changes: ["No changes to current design"]
        },
        {
          name: "Optimized",
          description: "New layout with improved messaging",
          trafficAllocation: 50,
          changes: [
            "Hero section with clear value proposition",
            "Social proof and testimonials",
            "Simplified product grid",
            "Prominent CTA buttons"
          ]
        }
      ],
      targetAudience: "Traffic to collection page",
      priority: calculatePriority("landing_page", collection.conversionRate, 3.5),
    });
  });
  
  return experiments;
}

/**
 * Generates checkout optimization experiment suggestions
 */
function generateCheckoutExperiments(dataset: SalesDataset): ExperimentSuggestion[] {
  const experiments: ExperimentSuggestion[] = [];
  
  // Checkout optimization based on overall conversion rate
  if (dataset.totals.conversionRate < 2.5) {
    experiments.push({
      id: "checkout-optimization-1",
      type: "checkout_optimization",
      title: "Simplify checkout process",
      description: "Test a streamlined checkout with fewer steps and fields",
      hypothesis: `Reducing checkout friction will increase conversion rate from ${dataset.totals.conversionRate}% to 3.5%+`,
      successMetrics: ["Checkout Completion Rate", "Time to Complete", "Abandonment Rate"],
      expectedImpact: {
        revenue: calculateCheckoutRevenue(dataset),
        conversion: 40,
        confidence: "high",
      },
      effort: "high",
      duration: "3 weeks",
      setup: [
        "Redesign checkout flow",
        "Implement guest checkout option",
        "Set up checkout analytics"
      ],
      variants: [
        {
          name: "Control",
          description: "Current checkout process",
          trafficAllocation: 50,
          changes: ["No changes to current flow"]
        },
        {
          name: "Streamlined",
          description: "Simplified checkout with fewer steps",
          trafficAllocation: 50,
          changes: [
            "Combine shipping and billing forms",
            "Add guest checkout option",
            "Reduce required fields",
            "Add progress indicator"
          ]
        }
      ],
      targetAudience: "All customers proceeding to checkout",
      priority: calculatePriority("checkout_optimization", dataset.totals.conversionRate, 3.5),
    });
  }
  
  return experiments;
}

/**
 * Generates product page experiment suggestions
 */
function generateProductPageExperiments(dataset: SalesDataset): ExperimentSuggestion[] {
  const experiments: ExperimentSuggestion[] = [];
  
  // Find products with low attach rates for product page optimization
  const lowAttachProducts = dataset.laggards.filter(product => product.attachRate < 10);
  
  lowAttachProducts.forEach((product, index) => {
    experiments.push({
      id: `product-page-${index + 1}`,
      type: "product_page",
      title: `Optimize ${product.title} product page`,
      description: `Test different layouts and content for ${product.title} product page`,
      hypothesis: `Improved product page will increase attach rate from ${product.attachRate}% to 15%+`,
      successMetrics: ["Add to Cart Rate", "Time on Page", "Product Page Views", "Attach Rate"],
      expectedImpact: {
        revenue: calculateProductPageRevenue(dataset, product),
        conversion: 50,
        confidence: "medium",
      },
      effort: "medium",
      duration: "2 weeks",
      setup: [
        "Create alternative product page layout",
        "Set up product page analytics",
        "Configure A/B testing"
      ],
      variants: [
        {
          name: "Control",
          description: "Current product page",
          trafficAllocation: 50,
          changes: ["No changes to current design"]
        },
        {
          name: "Enhanced",
          description: "Improved product page with better content",
          trafficAllocation: 50,
          changes: [
            "Larger, higher-quality images",
            "Detailed product specifications",
            "Customer reviews and ratings",
            "Clear add-to-cart button",
            "Related products section"
          ]
        }
      ],
      targetAudience: "Customers viewing product page",
      priority: calculatePriority("product_page", product.attachRate, 15),
    });
  });
  
  return experiments;
}

/**
 * Generates pricing experiment suggestions
 */
function generatePricingExperiments(dataset: SalesDataset): ExperimentSuggestion[] {
  const experiments: ExperimentSuggestion[] = [];
  
  // Find products with high attach rates that could benefit from pricing tests
  const highAttachProducts = dataset.bestSellers.filter(product => 
    product.attachRate > 20 && product.inventoryStatus === "healthy"
  );
  
  highAttachProducts.forEach((product, index) => {
    experiments.push({
      id: `pricing-${index + 1}`,
      type: "pricing",
      title: `Test pricing for ${product.title}`,
      description: `Test different price points for ${product.title} to optimize revenue`,
      hypothesis: `Strategic pricing adjustment will increase revenue per unit sold`,
      successMetrics: ["Revenue per Unit", "Units Sold", "Total Revenue", "Profit Margin"],
      expectedImpact: {
        revenue: calculatePricingRevenue(dataset, product),
        conversion: 5,
        confidence: "low",
      },
      effort: "low",
      duration: "4 weeks",
      setup: [
        "Set up dynamic pricing",
        "Configure revenue tracking",
        "Monitor inventory levels"
      ],
      variants: [
        {
          name: "Control",
          description: "Current pricing",
          trafficAllocation: 50,
          changes: ["No price changes"]
        },
        {
          name: "Test Price",
          description: "Adjusted pricing strategy",
          trafficAllocation: 50,
          changes: [
            "Test 10% price increase",
            "Monitor conversion impact",
            "Track revenue optimization"
          ]
        }
      ],
      targetAudience: "All customers viewing product",
      priority: calculatePriority("pricing", product.attachRate, 20),
    });
  });
  
  return experiments;
}

/**
 * Calculates expected revenue impact for cross-sell experiments
 */
function calculateExpectedRevenue(dataset: SalesDataset, currentRate: number, targetRate: number): number {
  const totalOrders = dataset.totals.currentTotal.amount / dataset.totals.averageOrderValue.amount;
  const potentialIncrease = (targetRate - currentRate) / 100;
  const estimatedAdditionalOrders = totalOrders * potentialIncrease;
  return estimatedAdditionalOrders * dataset.totals.averageOrderValue.amount * 0.3; // 30% of AOV for cross-sell
}

/**
 * Calculates expected revenue impact for upsell experiments
 */
function calculateUpsellRevenue(dataset: SalesDataset, product: SalesProductPerformance): number {
  const currentRevenue = product.gmv.amount;
  const upsellRate = 0.15; // 15% upsell rate
  const priceIncrease = 0.3; // 30% price increase for premium
  return currentRevenue * upsellRate * priceIncrease;
}

/**
 * Calculates expected revenue impact for landing page experiments
 */
function calculateLandingPageRevenue(dataset: SalesDataset, collection: any): number {
  const currentRevenue = collection.gmv.amount;
  const conversionImprovement = 0.4; // 40% conversion improvement
  return currentRevenue * conversionImprovement;
}

/**
 * Calculates expected revenue impact for checkout experiments
 */
function calculateCheckoutRevenue(dataset: SalesDataset): number {
  const currentRevenue = dataset.totals.currentTotal.amount;
  const conversionImprovement = 0.4; // 40% conversion improvement
  return currentRevenue * conversionImprovement;
}

/**
 * Calculates expected revenue impact for product page experiments
 */
function calculateProductPageRevenue(dataset: SalesDataset, product: SalesProductPerformance): number {
  const currentRevenue = product.gmv.amount;
  const attachRateImprovement = 0.5; // 50% attach rate improvement
  return currentRevenue * attachRateImprovement;
}

/**
 * Calculates expected revenue impact for pricing experiments
 */
function calculatePricingRevenue(dataset: SalesDataset, product: SalesProductPerformance): number {
  const currentRevenue = product.gmv.amount;
  const priceOptimization = 0.1; // 10% revenue optimization
  return currentRevenue * priceOptimization;
}

/**
 * Calculates priority score for experiments (1-10 scale)
 */
function calculatePriority(type: ExperimentType, currentMetric: number, targetMetric: number): number {
  const improvement = (targetMetric - currentMetric) / currentMetric;
  const effortScores = {
    cross_sell: 3,
    upsell: 2,
    landing_page: 2,
    checkout_optimization: 1,
    product_page: 2,
    pricing: 3,
  };
  
  const baseScore = Math.min(improvement * 10, 10);
  const effortBonus = effortScores[type];
  
  return Math.round(baseScore + effortBonus);
}

/**
 * Exports experiment suggestions to CSV format
 */
export function exportExperimentsToCSV(analysis: ExperimentAnalysis): string {
  const lines: string[] = [];
  
  // Header
  lines.push("ID,Type,Title,Priority,Effort,Expected Revenue Impact,Confidence,Duration,Target Audience");
  
  // All experiments
  analysis.prioritized.forEach(experiment => {
    lines.push([
      experiment.id,
      experiment.type.replace('_', ' '),
      `"${experiment.title}"`,
      experiment.priority.toString(),
      experiment.effort,
      `$${experiment.expectedImpact.revenue.toFixed(2)}`,
      experiment.expectedImpact.confidence,
      experiment.duration,
      `"${experiment.targetAudience}"`
    ].join(","));
  });
  
  return lines.join("\n");
}
