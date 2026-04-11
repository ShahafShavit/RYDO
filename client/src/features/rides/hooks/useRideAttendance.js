import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/rides-api';

export function useRideAttendance(rideId) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rides', 'detail', rideId] });
    queryClient.invalidateQueries({ queryKey: ['rides', 'groups'] });
  };

  const join = useMutation({
    mutationFn: () => ridesApi.joinRide(rideId),
    onSuccess: invalidate,
  });

  const leave = useMutation({
    mutationFn: () => ridesApi.leaveRide(rideId),
    onSuccess: invalidate,
  });

  return { joinRide: join.mutateAsync, leaveRide: leave.mutateAsync, isJoining: join.isPending, isLeaving: leave.isPending };
}
