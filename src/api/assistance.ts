/**
 * Assistance API — Fetch support contact details
 */
import apiClient from './client';
import {API_ENDPOINTS} from './config';

export interface AssistanceData {
  id?: number;
  phone?: string;
  email?: string;
  timing?: string;
}

export interface AssistanceResponse {
  success: boolean;
  message: string;
  data: AssistanceData;
  publish?: boolean;
}

export const getAssistanceData = async (): Promise<AssistanceResponse> => {
  const response = await apiClient.get<AssistanceResponse>(
    API_ENDPOINTS.ASSISTANCE_DATA,
  );
  return response.data;
};
