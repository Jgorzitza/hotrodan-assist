import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const ensureClient = () => {
  if (process.env.NODE_ENV !== "production") {
    if (!global.prismaGlobal) {
      global.prismaGlobal = new PrismaClient();
    }
    return global.prismaGlobal;
  }
  return global.prismaGlobal ?? (global.prismaGlobal = new PrismaClient());
};

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (process.env.USE_MOCK_DATA === "true") {
      throw new Error(
        "Prisma disabled in mock/test mode. Set USE_MOCK_DATA=false to enable.",
      );
    }
    const client = ensureClient();
    // @ts-ignore dynamic property access
    return Reflect.get(client, prop, receiver);
  },
});

export default prisma;
