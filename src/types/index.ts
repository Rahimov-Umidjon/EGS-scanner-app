export type SelectUser = {
  id: number;
  firstName: string;
  lastName: string;
};
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


export type UsersSelectResponse = {
  data: SelectUser[];
  meta: PaginationMeta;
};

export type DeviceStatus =
  | "in_stock"
  | "assigned"
  | "in_repair"
  | "lost"
  | "decommissioned"
  | "damaged"
  | "in_storage"
  | "broken"
  | "returned_for_verification"


export interface Devices {
  id: number;
  inventoryNumber: string;
  serialNumber: string;
  qrCode: string;

  deviceTypeId: number;
  brandId: number;
  modelId: number;
  currentDepartmentId: number;
  currentUserId: number | null;

  purchasePrice: string;
  purchaseDate: string;
  warrantyUntil: string;

  status: "active" | "inactive" | "broken" | string;
  condition: "excellent" | "good" | "fair" | "poor" | string;

  note: string;

  createdAt: string;
  updatedAt: string;

  deviceType: {
    id: number;
    name: string;
    icon: string;
    createdAt: string;
    updatedAt: string;
  };

  brand: {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
  };

  model: {
    id: number;
    brandId: number;
    deviceTypeId: number;
    name: string;
    createdAt: string;
    updatedAt: string;
  };

  currentDepartment: {
    id: number;
    name: string;
    code: string;
    createdAt: string;
    updatedAt: string;
  };

  currentUser: {
    id: number;
    full_name: string;
    email: string;
    phone_number: string;
  } | null;
}

export type UserDevicesResponse = {
  data: Devices[];
};

export type VerifyBarcodeResponse = {
  success: boolean;
  message?: string;
  nextDeviceId: number | null;
  completed: boolean; // barcha device'lar tasdiqlandimi
};