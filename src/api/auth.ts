import apiClient from './client';
import {API_ENDPOINTS} from './config';
import {getToken} from '../services/storage';

export interface ApplicantLoginPayload {
  phone?: string;
  applicationId?: string;
  isDraft?: boolean;
}

export interface ApplicantLoginResponse {
  success?: boolean;
  status?: boolean;
  message: string;
  data?: {
    phone?: string;
    [key: string]: any;
  };
  otp?: number;
  publish?: boolean;
}

/**
 * Sends OTP to the applicant's mobile number or application ID
 * @param payload { phone?: string; applicationId?: string; isDraft?: boolean }
 */
export const applicantLogin = async (
  payload: ApplicantLoginPayload,
): Promise<ApplicantLoginResponse> => {
  const response = await apiClient.post<ApplicantLoginResponse>(
    API_ENDPOINTS.APPLICANT_LOGIN,
    {
      isDraft: true,
      ...payload,
    },
  );
  return response.data;
};

export interface ResendOtpPayload {
  phone: string;
}

export interface ResendOtpResponse {
  status?: boolean;
  success?: boolean;
  message: string;
  otp?: number;
}

/**
 * Resends OTP to the applicant's mobile number
 * @param payload { phone: string }
 */
export const resendOtp = async (
  payload: ResendOtpPayload,
): Promise<ResendOtpResponse> => {
  const response = await apiClient.post<ResendOtpResponse>(
    API_ENDPOINTS.RESEND_OTP,
    payload,
  );
  return response.data;
};

export interface VerifyOtpPayload {
  data: string;
}

export interface UserDetails {
  id: number;
  email: string | null;
  name: string;
  cc: string;
  phone: string;
  userType: string;
  otp: string | null;
  otpValideTime?: string;
  lastLoginAt?: string;
  updatedAt?: string;
}

export interface VerifyOtpResponse {
  status?: boolean;
  success?: boolean;
  message: string;
  data?: {
    token: string;
    userDetails: UserDetails;
  };
}

export interface SendPhoneOtpPayload {
  phone: string;
}

export interface SendPhoneOtpResponse {
  status?: boolean;
  success?: boolean;
  message: string;
  data?: any;
  otp?: number;
}

/**
 * Sends OTP to phone number
 * @param payload { phone: string }
 */
export const sendPhoneOtp = async (
  payload: SendPhoneOtpPayload,
): Promise<SendPhoneOtpResponse> => {
  try {
    const response = await apiClient.post<SendPhoneOtpResponse>(
      API_ENDPOINTS.SEND_PHONE_OTP,
      payload,
    );
    return response.data;
  } catch (err: any) {
    try {
      // Localhost dev server fallback for http://localhost:3000/api/send-phone-otp
      const localResp = await fetch('http://localhost:3000/api/send-phone-otp', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      if (localResp.ok) {
        const data = await localResp.json();
        return data;
      }
    } catch {
      // ignore local fallback error and rethrow original error
    }
    throw err;
  }
};

/**
 * Verifies OTP by sending AES-256-CBC encrypted payload
 * @param payload { data: string }
 */
export const verifyOtp = async (
  payload: VerifyOtpPayload,
): Promise<VerifyOtpResponse> => {
  try {
    const response = await apiClient.post<VerifyOtpResponse>(
      API_ENDPOINTS.VERIFY_OTP,
      payload,
    );
    return response.data;
  } catch (err: any) {
    try {
      // Localhost dev server fallback for http://localhost:3000/api/verify-otp
      const localResp = await fetch('http://localhost:3000/api/verify-otp', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      if (localResp.ok) {
        const data = await localResp.json();
        return data;
      }
    } catch {
      // ignore local fallback error and rethrow original error
    }
    throw err;
  }
};

export interface VerifyAadhaarPayload {
  aadhaarNo: string;
  consent: boolean;
  source?: string;
  applicationId?: string;
  [key: string]: any;
}

export interface VerifyAadhaarResponse {
  message: string;
  data: string; // DigiLocker redirect URL: "https://dg.setu.co/digilocker/login/..."
  redirectUrl?: string; // Redirect URL callback with aadhaarToken
  status: boolean;
  publish?: boolean;
}

/**
 * Initiates Aadhaar verification via DigiLocker
 * @param payload { aadhaarNo: string, consent: boolean, source?: string }
 */
export const verifyAadhaar = async (
  payload: VerifyAadhaarPayload,
): Promise<VerifyAadhaarResponse> => {
  const requestPayload: VerifyAadhaarPayload = {
    source: 'app',
    ...payload,
  };
  const response = await apiClient.post<VerifyAadhaarResponse>(
    API_ENDPOINTS.VERIFY_AADHAAR,
    requestPayload,
  );
  return response.data;
};

export interface AadhaarDetailsResponse {
  status?: boolean;
  message?: string;
  applicationNumber?: string;
  publish?: boolean;
  data?: any;
  [key: string]: any;
}

/**
 * Fetches Aadhaar details via GET request to redirectUrl after DigiLocker completion
 * @param url Full redirectUrl returned by verifyAadhaar (e.g. https://api.wemanipur.com/api/aadhaar-details?aadhaarToken=...)
 */
export const getAadhaarDetails = async (
  url: string,
): Promise<AadhaarDetailsResponse> => {
  try {
    const response = await apiClient.get<AadhaarDetailsResponse>(url);
    return response.data;
  } catch (err: any) {
    if (err?.response?.data) {
      return err.response.data;
    }
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          Origin: 'https://wemanipur.com',
          Referer: 'https://wemanipur.com/',
        },
      });
      const data = await resp.json();
      return data;
    } catch {
      throw err;
    }
  }
};

export interface DeleteUserPayload {
  phone: string;
  token?: string;
}

export interface DeleteUserResponse {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: any;
}

/**
 * Temporary / Dev: Delete user by mobile number
 * Passes authentication token in both Authorization header and request payload
 * @param payload { phone: string, token?: string }
 */
export const deleteUser = async (
  payload: DeleteUserPayload,
): Promise<DeleteUserResponse> => {
  const storedToken = await getToken();
  const token = payload.token || storedToken || undefined;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.token = token;
    headers['x-access-token'] = token;
  }

  const requestBody: Record<string, any> = {
    phone: payload.phone,
  };
  if (token) {
    requestBody.token = token;
  }

  const response = await apiClient.post<DeleteUserResponse>(
    API_ENDPOINTS.FRONTEND_DELETE_USER,
    requestBody,
    {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    },
  );
  return response.data;
};
