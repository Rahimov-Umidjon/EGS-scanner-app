import { UserDevicesResponse, UsersSelectResponse, VerifyBarcodeResponse } from '@/types';
import { axiosClient } from './axiosClient'; 

const PAGE_SIZE = 50;

export async function fetchUsersSelect(params: {
  pageParam?: number;
  search?: string;
}): Promise<UsersSelectResponse> {
  const { pageParam = 1, search = '' } = params;
  const { data } = await axiosClient.get<UsersSelectResponse>('/users/select', {
    params: {
      page: pageParam,
      limit: PAGE_SIZE,
      search: search || undefined,
    },
  });

  console.log(data , 'userpage data')
  return data;
}

export async function fetchUserDevices(userId: number): Promise<UserDevicesResponse> {
  const { data } = await axiosClient.get<UserDevicesResponse>(`/devices/by-user/${userId}`);
  return data;
}

export async function verifyDeviceBarcode(params: {
  userId: number;
  deviceId: number;
  barcode: string;
}): Promise<VerifyBarcodeResponse> {
  const { userId, barcode } = params;
  const { data } = await axiosClient.post<VerifyBarcodeResponse>(
    `devices/verify`,
    { barcode , userId }
  );
  return data;
}