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

export type ActiveInspection = {
  id: number;
  title: string;
} | null;

export type Department = {
  id: number;
  name: string;
  code: string;
  userCount: number;
};

export type DepartmentsSummary = {
  totalUsers: number;
  totalDevices: number;
  checkedDevices: number;
  remainingDevices: number;
  auditPercent: number;
};

export type DepartmentsResponse = {
  data: Department[];
  summary: DepartmentsSummary;
  activeInspection: ActiveInspection;
};

export type DepartmentUser = SelectUser & {
  totalDevices: number;
  checkedDevices: number;
  auditPercent: number;
};

export type DepartmentUsersResponse = {
  data: DepartmentUser[];
  meta: PaginationMeta;
  activeInspection: ActiveInspection;
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

  status: DeviceStatus;
  condition: "excellent" | "good" | "fair" | "poor" | string;

  isVerified: boolean;
  lastVerifiedAt: string | null;
  deviceInfo: string | null;

  note: string | null;

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
    firstName: string;
    lastName: string;
    employeeId: string | null;
    email: string;
  } | null;
}

export type UserDevicesResponse = Devices[];

export type VerifyBarcodeResponse = {
  success: boolean;
  message?: string;
  nextDeviceId: number | null;
  completed: boolean; // barcha device'lar tasdiqlandimi
};