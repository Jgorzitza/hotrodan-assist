import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const disablePrisma =
  process.env.VITEST === "true" || process.env.USE_MOCK_DATA === "true";

let prisma: PrismaClient;

if (disablePrisma) {
  prisma = new Proxy({} as PrismaClient, {
    get() {
      throw new Error(
        "Prisma disabled in mock/test mode. Set USE_MOCK_DATA=false to enable.",
      );
    },
  });
} else {
  if (process.env.NODE_ENV !== "production") {
    if (!global.prismaGlobal) {
      global.prismaGlobal = new PrismaClient();
    }
  }
  prisma = global.prismaGlobal ?? new PrismaClient();
}

export default prisma;
