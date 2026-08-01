import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verifyDeviceBarcode } from '../api/users';

export function useVerifyDevice(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { deviceId: number; barcode: string }) =>
      verifyDeviceBarcode({ userId, ...params }),
    onSuccess: () => {
      // Device holatlarini yangilash uchun ro'yxatni qayta so'raymiz
      queryClient.invalidateQueries({ queryKey: ['user-devices', userId] });
    },
  });
}