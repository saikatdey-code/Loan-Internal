/**
 * Loan API Services
 * Endpoints for fetching unauthenticated loan details and submitting personal information.
 */
import {Platform} from 'react-native';
import apiClient from './client';
import {API_ENDPOINTS} from './config';

export interface LoanUserDetails {
  id: number;
  name: string;
  email: string;
  phone: string;
  cc: string;
  aadhaarNo: string;
  aadhaarVerified: boolean;
  dob: string;
  userType: string;
  gender: string;
  guardianName: string | null;
  relationWithGuardian: string | null;
  guardianPhoneNumber: string | null;
  marriageStatus: string | null;
  category: string | null;
  photo: string | null;
}

export interface LoanDetailsData {
  id: string;
  applicationNumber: string;
  addressId: string | null;
  step: string;
  loanStatus: string;
  aadhaarNo: string;
  appliedAt: string;
  amountRequired: number | null;
  purposeOfLoan: string | null;
  tenure: number | null;
  preferredRepaymentFrequency: string | null;
  monthlyIncome: number | null;
  existingLoan: string | null;
  existingLoanAmount: number | null;
  otherEconomicGroup: string | null;
  otherBankName: string | null;
  fieldList?: any;
  createdAt: string;
  updatedAt: string;
  userDetails: LoanUserDetails;
  [key: string]: any;
}

export interface LoanDetailsResponse {
  success: boolean;
  message: string;
  data: LoanDetailsData;
}

export interface UpdatePersonalDetailsPayload {
  loanId: string;
  name: string;
  dob: string; // YYYY-MM-DD
  gender: string; // MALE, FEMALE, OTHER
  category: string; // General, ST, SC, OBC
  phone: string;
  photo?: {
    uri: string;
    fileName?: string;
    type?: string;
  } | null;
}

export interface UpdatePersonalDetailsResponse {
  success: boolean;
  message: string;
  data: LoanDetailsData;
  token?: string;
}

/**
 * Fetch unauthenticated loan details by loanId
 */
export const getLoanDetailsUnauth = async (
  loanId: string,
): Promise<LoanDetailsResponse> => {
  const response = await apiClient.get<LoanDetailsResponse>(
    API_ENDPOINTS.LOAN_DETAILS_UNAUTH(loanId),
  );
  return response.data;
};

/**
 * Submit / Update personal details (multipart/form-data)
 */
export const updatePersonalDetailsUnauth = async (
  payload: UpdatePersonalDetailsPayload,
): Promise<UpdatePersonalDetailsResponse> => {
  const formData = new FormData();
  formData.append('loanId', payload.loanId);
  formData.append('name', payload.name);
  formData.append('dob', payload.dob);
  formData.append('gender', payload.gender);
  formData.append('category', payload.category);
  formData.append('phone', payload.phone);

  if (payload.photo && payload.photo.uri) {
    const fileUri =
      Platform.OS === 'ios'
        ? payload.photo.uri.replace('file://', '')
        : payload.photo.uri;

    formData.append('photo', {
      uri: fileUri,
      name: payload.photo.fileName || `photo_${Date.now()}.jpg`,
      type: payload.photo.type || 'image/jpeg',
    } as any);
  }

  const response = await apiClient.post<UpdatePersonalDetailsResponse>(
    API_ENDPOINTS.LOAN_PERSONAL_DETAILS_UNAUTH,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
};

export interface SubmitSHGPayload {
  loanId: string;
  shgName: string;
  shgId?: string;
  dateOfFormation: string; // YYYY-MM-DD
  certificate?: {
    uri: string;
    fileName?: string;
    type?: string;
  } | null;
  bankCopy?: {
    uri: string;
    fileName?: string;
    type?: string;
  } | null;
}

export interface SubmitSHGResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Submit SHG details (multipart/form-data)
 * POST /api/loan/shg
 */
export const submitSHGDetails = async (
  payload: SubmitSHGPayload,
): Promise<SubmitSHGResponse> => {
  const formData = new FormData();
  formData.append('loanId', payload.loanId);
  formData.append('shgName', payload.shgName);
  if (payload.shgId) {
    formData.append('shgId', payload.shgId);
  }
  formData.append('dateOfFormation', payload.dateOfFormation);

  if (payload.certificate && payload.certificate.uri) {
    if (
      payload.certificate.uri.startsWith('http://') ||
      payload.certificate.uri.startsWith('https://')
    ) {
      formData.append('certificateUrl', payload.certificate.uri);
    } else {
      const fileUri =
        Platform.OS === 'ios'
          ? payload.certificate.uri.replace('file://', '')
          : payload.certificate.uri;

      formData.append('certificate', {
        uri: fileUri,
        name: payload.certificate.fileName || `certificate_${Date.now()}.png`,
        type: payload.certificate.type || 'image/png',
      } as any);
    }
  }

  if (payload.bankCopy && payload.bankCopy.uri) {
    if (
      payload.bankCopy.uri.startsWith('http://') ||
      payload.bankCopy.uri.startsWith('https://')
    ) {
      formData.append('bankCopyUrl', payload.bankCopy.uri);
    } else {
      const fileUri =
        Platform.OS === 'ios'
          ? payload.bankCopy.uri.replace('file://', '')
          : payload.bankCopy.uri;

      formData.append('bankCopy', {
        uri: fileUri,
        name: payload.bankCopy.fileName || `bankCopy_${Date.now()}.png`,
        type: payload.bankCopy.type || 'image/png',
      } as any);
    }
  }

  try {
    const response = await apiClient.post<SubmitSHGResponse>(
      API_ENDPOINTS.LOAN_SHG,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  } catch (err: any) {
    // If backend in local development is listening on localhost:3000
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/loan/shg'
            : 'http://localhost:3000/api/loan/shg';
        const localResponse = await apiClient.post<SubmitSHGResponse>(
          localHostUrl,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

export interface SubmitAddressPayload {
  district: string;
  locality: string;
  panchayat: string;
  loanId: string;
}

export interface SubmitAddressResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Submit address details (POST /api/loan/address-details)
 */
export const submitAddressDetails = async (
  payload: SubmitAddressPayload,
): Promise<SubmitAddressResponse> => {
  try {
    const response = await apiClient.post<SubmitAddressResponse>(
      API_ENDPOINTS.LOAN_ADDRESS_DETAILS,
      payload,
    );

    return response.data;
  } catch (err: any) {
    // If backend in local development is listening on localhost:3000
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/loan/address-details'
            : 'http://localhost:3000/api/loan/address-details';
        const localResponse = await apiClient.post<SubmitAddressResponse>(
          localHostUrl,
          payload,
        );
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

export interface SubmitIncomePayload {
  familyIncome: string;
  otherFamilyIncome: string | null;
  loanId: string;
}

export interface SubmitIncomeResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Submit annual family income details (POST /api/loan/details)
 */
export const submitIncomeDetails = async (
  payload: SubmitIncomePayload,
): Promise<SubmitIncomeResponse> => {
  try {
    const response = await apiClient.post<SubmitIncomeResponse>(
      API_ENDPOINTS.LOAN_DETAILS,
      payload,
    );

    return response.data;
  } catch (err: any) {
    // If backend in local development is listening on localhost:3000
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/loan/details'
            : 'http://localhost:3000/api/loan/details';
        const localResponse = await apiClient.post<SubmitIncomeResponse>(
          localHostUrl,
          payload,
        );
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

export interface OccupationItem {
  id: number;
  name: string;
}

export interface OccupationResponse {
  success: boolean;
  message: string;
  data: OccupationItem[];
}

/**
 * Fetch occupation list (GET /api/occupation)
 */
export const getOccupations = async (): Promise<OccupationResponse> => {
  try {
    const response = await apiClient.get<OccupationResponse>(
      API_ENDPOINTS.OCCUPATION,
    );
    return response.data;
  } catch (err: any) {
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/occupation'
            : 'http://localhost:3000/api/occupation';
        const localResponse = await apiClient.get<OccupationResponse>(localHostUrl);
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

export interface SubmitEconomicActivityPayload {
  loanId: string;
  economicActivity: string;
  otherEconomicGroup: string | null;
  descriptionOfProposedActivity: string;
}

export interface SubmitEconomicActivityResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Submit economic activity details (POST /api/loan/details)
 */
export const submitEconomicActivityDetails = async (
  payload: SubmitEconomicActivityPayload,
): Promise<SubmitEconomicActivityResponse> => {
  try {
    const response = await apiClient.post<SubmitEconomicActivityResponse>(
      API_ENDPOINTS.LOAN_DETAILS,
      payload,
    );
    return response.data;
  } catch (err: any) {
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/loan/details'
            : 'http://localhost:3000/api/loan/details';
        const localResponse = await apiClient.post<SubmitEconomicActivityResponse>(
          localHostUrl,
          payload,
        );
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

/**
 * Fetch loan details with authentication (GET /api/loan/details/{loanId})
 */
export const getLoanDetailsAuth = async (
  loanId: string,
): Promise<LoanDetailsResponse> => {
  try {
    const response = await apiClient.get<LoanDetailsResponse>(
      API_ENDPOINTS.LOAN_DETAILS_AUTH(loanId),
    );
    return response.data;
  } catch (err: any) {
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? `http://10.0.2.2:3000/api/loan/details/${loanId}`
            : `http://localhost:3000/api/loan/details/${loanId}`;
        const localResponse = await apiClient.get<LoanDetailsResponse>(localHostUrl);
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

export interface SubmitDeclarationPayload {
  loanId: string;
  declearedName: string;
  declearedGuardianName: string;
  declaration: boolean;
  noObjection: boolean;
}

export interface SubmitDeclarationResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Submit declaration details and finalize application (POST /api/loan/details)
 */
export const submitDeclarationDetails = async (
  payload: SubmitDeclarationPayload,
): Promise<SubmitDeclarationResponse> => {
  try {
    const response = await apiClient.post<SubmitDeclarationResponse>(
      API_ENDPOINTS.LOAN_DETAILS,
      payload,
    );
    return response.data;
  } catch (err: any) {
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/loan/details'
            : 'http://localhost:3000/api/loan/details';
        const localResponse = await apiClient.post<SubmitDeclarationResponse>(
          localHostUrl,
          payload,
        );
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};


export interface DistrictItem {
  id: number;
  name: string;
  districtCode: string;
}

export interface DistrictResponse {
  success: boolean;
  message: string;
  data: DistrictItem[];
}

/**
 * Fetch district list by state code (GET /api/district?stateCode=MN)
 */
export const getDistricts = async (
  stateCode: string = 'MN',
): Promise<DistrictResponse> => {
  try {
    const response = await apiClient.get<DistrictResponse>(
      API_ENDPOINTS.DISTRICT(stateCode),
    );
    return response.data;
  } catch (err: any) {
    if (__DEV__ && (err?.code === 'ERR_NETWORK' || err?.response?.status === 404)) {
      try {
        const localHostUrl =
          Platform.OS === 'android'
            ? `http://10.0.2.2:3000/api/district?stateCode=${stateCode}`
            : `http://localhost:3000/api/district?stateCode=${stateCode}`;
        const localResponse = await apiClient.get<DistrictResponse>(localHostUrl);
        return localResponse.data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

export interface LoanListItem {
  id: string;
  applicationNumber: string;
  applicationId?: string;
  addressId?: number | null;
  step?: string;
  loanStatus?: string;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  userDetails?: LoanUserDetails;
  [key: string]: any;
}

export interface LoanListResponse {
  success: boolean;
  message: string;
  data: {
    rows: LoanListItem[];
    count: number;
    page: number;
    limit: number;
    noOfPage: number;
  };
}

/**
 * Fetch list of user's loan applications (GET /api/loan/list)
 */
export const getLoanList = async (): Promise<LoanListResponse> => {
  const response = await apiClient.get<LoanListResponse>(
    API_ENDPOINTS.LOAN_LIST,
  );
  return response.data;
};
