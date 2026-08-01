import { useQuery } from '@tanstack/react-query';
import { fetchUserDevices } from '../api/users';

export function useUserDevices(userId: number | null) {
  return useQuery({
    queryKey: ['user-devices', userId],
    queryFn: () => fetchUserDevices(userId as number),
    enabled: userId != null, // userId tanlanmaguncha so'rov yubormaydi
  });
}