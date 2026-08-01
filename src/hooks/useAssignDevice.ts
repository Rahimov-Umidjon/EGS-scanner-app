// hooks/useAssignDevice.ts
import { axiosClient } from '@/api/axiosClient';
import { useMutation, useQueryClient } from '@tanstack/react-query'; 

type AssignDeviceInput = {
  barcode: string;
  userId: number;
};

type AssignDeviceResponse = {
  success: boolean;
  notFound?: boolean;
  message: string;
  barcode?: string;
  device?: any;
};

export function useAssignDevice(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignDeviceInput): Promise<AssignDeviceResponse> => {
      const res = await axiosClient.post('/devices/assign-by-barcode', input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-devices', userId] });
    },
  });
}