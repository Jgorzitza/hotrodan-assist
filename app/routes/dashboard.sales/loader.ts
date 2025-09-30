import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { getSalesData, resolveMockState, shouldUseMockData } from "~/mocks";

export async function loader({ request, context }: LoaderFunctionArgs) {
  if (shouldUseMockData(context?.env ?? process.env)) {
    const mockState = resolveMockState(request.url);
    return json(getSalesData(mockState));
  }

  // TODO: replace with live sales integration once backend endpoints are ready.
  throw new Response("Live sales data not implemented", { status: 501 });
}
