import {
  DepartmentsResponse,
  DepartmentUsersResponse,
  UserDevicesResponse,
  VerifyBarcodeResponse,
} from '@/types';
import { axiosClient } from './axiosClient';

const PAGE_SIZE = 50;

export async function fetchDepartments(): Promise<DepartmentsResponse> {
  const { data } = await axiosClient.get<DepartmentsResponse>('/users/select/hr');
  return data;
}

export async function fetchDepartmentUsers(params: {
  departmentId: number;
  pageParam?: number;
  search?: string;
}): Promise<DepartmentUsersResponse> {
  const { departmentId, pageParam = 1, search = '' } = params;
  const { data } = await axiosClient.get<DepartmentUsersResponse>(
    `/users/select/hr/${departmentId}`,
    {
      params: {
        page: pageParam,
        limit: PAGE_SIZE,
        search: search || undefined,
      },
    }
  );

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