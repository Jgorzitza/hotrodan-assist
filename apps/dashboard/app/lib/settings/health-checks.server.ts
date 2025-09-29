import { performance } from "node:perf_hooks";

export type HealthCheckResult = {
  service: string;
  status: "healthy" | "unhealthy" | "unknown";
  responseTime: number;
  message: string;
  lastChecked: string;
};

export type BackendService = {
  name: string;
  url: string;
  envKey: string;
  description: string;
};

const BACKEND_SERVICES: BackendService[] = [
  {
    name: "RAG API",
    url: process.env.RAG_API_URL || "http://localhost:3001",
    envKey: "RAG_API_URL",
    description: "RAG service for document processing and querying"
  },
  {
    name: "MCP API",
    url: process.env.MCP_API_URL || "http://localhost:3002",
    envKey: "MCP_API_URL", 
    description: "Model Context Protocol API for external integrations"
  },
  {
    name: "SEO API",
    url: process.env.SEO_API_URL || "http://localhost:3003",
    envKey: "SEO_API_URL",
    description: "SEO analysis and optimization service"
  },
  {
    name: "Inventory API",
    url: process.env.INVENTORY_API_URL || "http://localhost:3004",
    envKey: "INVENTORY_API_URL",
    description: "Inventory management and reorder point service"
  },
  {
    name: "Sales API",
    url: process.env.SALES_API_URL || "http://localhost:3005",
    envKey: "SALES_API_URL",
    description: "Sales analytics and insights service"
  },
  {
    name: "Approvals API",
    url: process.env.APPROVALS_API_URL || "http://localhost:3006",
    envKey: "APPROVALS_API_URL",
    description: "Customer service approval workflow service"
  }
];

export async function checkServiceHealth(service: BackendService): Promise<HealthCheckResult> {
  const start = performance.now();
  const timestamp = new Date().toISOString();
  
  try {
    // Check if environment variable is set
    const envValue = process.env[service.envKey];
    if (!envValue) {
      return {
        service: service.name,
        status: "unknown",
        responseTime: 0,
        message: `Environment variable ${service.envKey} not configured`,
        lastChecked: timestamp
      };
    }

    // Try to ping the service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${service.url}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - start);
    
    if (response.ok) {
      return {
        service: service.name,
        status: "healthy",
        responseTime,
        message: `Service responding normally (${response.status})`,
        lastChecked: timestamp
      };
    } else {
      return {
        service: service.name,
        status: "unhealthy",
        responseTime,
        message: `Service returned error status ${response.status}`,
        lastChecked: timestamp
      };
    }
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);
    let message = "Service unreachable";
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        message = "Service timeout (5s)";
      } else {
        message = `Connection error: ${error.message}`;
      }
    }
    
    return {
      service: service.name,
      status: "unhealthy",
      responseTime,
      message,
      lastChecked: timestamp
    };
  }
}

export async function checkAllServicesHealth(): Promise<HealthCheckResult[]> {
  const healthChecks = await Promise.allSettled(
    BACKEND_SERVICES.map(service => checkServiceHealth(service))
  );
  
  return healthChecks.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        service: BACKEND_SERVICES[index].name,
        status: "unknown" as const,
        responseTime: 0,
        message: `Health check failed: ${result.reason}`,
        lastChecked: new Date().toISOString()
      };
    }
  });
}

export function getEnvironmentStatus(): Record<string, { present: boolean; value?: string }> {
  const envKeys = [
    "USE_MOCK_DATA",
    "ENABLE_MCP", 
    "ENABLE_SEO",
    "ENABLE_INVENTORY",
    "RAG_API_URL",
    "MCP_API_URL",
    "SEO_API_URL", 
    "INVENTORY_API_URL",
    "SALES_API_URL",
    "APPROVALS_API_URL"
  ];
  
  const status: Record<string, { present: boolean; value?: string }> = {};
  
  for (const key of envKeys) {
    const value = process.env[key];
    status[key] = {
      present: !!value,
      value: value ? (key.includes("URL") ? value : "***") : undefined
    };
  }
  
  return status;
}
