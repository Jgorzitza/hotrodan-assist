export const isMockMode = () => process.env.USE_MOCK_DATA !== "false";

export const getStoreDomainFromParams = (requestUrl: string) => {
  const url = new URL(requestUrl);
  return url.searchParams.get("shop");
};
