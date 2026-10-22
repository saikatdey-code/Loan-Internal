/**
 * Notification API service
 */
import apiClient from './client';
import {API_ENDPOINTS} from './config';

export interface NotificationItem {
  id: string | number;
  userId?: number;
  loanId?: string;
  district?: number;
  notificationType?: string;
  actionBy?: number;
  comment?: string;
  seen?: boolean;
  status?: string;
  isRead?: boolean;
  readAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  message?: string;
  description?: string;
  actionByUser?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    cc: string;
    userName: string;
    userType: string;
  };
  // Fallback for loan objects
  applicationNumber?: string;
  applicationId?: string;
  step?: string;
  loanStatus?: string;
  [key: string]: any;
}

export interface NotificationListResponse {
  success: boolean;
  message: string;
  data: {
    rows: NotificationItem[];
    count: number;
    page: number;
    limit: number;
    noOfPage: number;
  };
}

/**
 * Fetch list of user's notifications (GET /api/notification/list?page=1&limit=10)
 */
export const getNotificationList = async (
  page = 1,
  limit = 10,
): Promise<NotificationListResponse> => {
  const response = await apiClient.get<NotificationListResponse>(
    API_ENDPOINTS.NOTIFICATION_LIST,
    {
      params: {page, limit},
    },
  );
  return response.data;
};
