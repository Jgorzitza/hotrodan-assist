import { json, type LoaderFunctionArgs } from "@remix-run/node";
import {
  getDashboardHomeData,
  resolveMockState,
  shouldUseMockData
} from "~/mocks";

export async function loader({ request, context }: LoaderFunctionArgs) {
  if (shouldUseMockData(context?.env ?? process.env)) {
    const mockState = resolveMockState(request.url);
    return json(getDashboardHomeData(mockState));
  }

  // TODO: replace with live data integration once backend endpoints are ready.
  throw new Response("Live dashboard data not implemented", { status: 501 });
}
