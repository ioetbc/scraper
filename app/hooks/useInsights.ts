import {useQuery} from "@tanstack/react-query";
import {hc} from "hono/client";
import type {AppType} from "../../server/index";
import type {InsightsResult} from "#/types";

const client = hc<AppType>("/");

export function useInsights(searchId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["insights", searchId],
    queryFn: async (): Promise<InsightsResult> => {
      if (!searchId) {
        throw new Error("No search ID provided");
      }

      const res = await client.api.insights.$post({
        json: {searchId},
      });

      const data = await res.json();

      if ("error" in data) {
        throw new Error((data as {error: string}).error);
      }

      return data as InsightsResult;
    },
    enabled: !!searchId && enabled,
    staleTime: Infinity, // Insights don't change, cache forever per searchId
    retry: false, // Don't retry on error (e.g., insufficient data)
  });
}
