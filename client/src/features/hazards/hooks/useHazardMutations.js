import { useMutation } from '@tanstack/react-query';
import { hazardsApi } from '@/features/hazards/api/hazards-api';
import { normalizeHazard } from '@/features/hazards/hazard-mapper';

export function useReportLiveHazard({ rideId, onSuccess }) {
  return useMutation({
    mutationFn: async (payload) => normalizeHazard(await hazardsApi.createOnRide(rideId, payload)),
    onSuccess: (hazard) => {
      onSuccess?.(hazard);
    },
  });
}

export function useVoteHazard({ onSuccess }) {
  return useMutation({
    mutationFn: async ({ hazardId, ...payload }) => hazardsApi.vote(hazardId, payload),
    onSuccess: (result, variables) => {
      onSuccess?.(result, variables);
    },
  });
}
