/**
 * API Configuration Constants
 */

export const API_BASE_URL = 'https://api.wemanipur.com';

export const API_ENDPOINTS = {
  APPLICANT_LOGIN: '/api/applicant/login',
  RESEND_OTP: '/api/resend-otp',
  SEND_PHONE_OTP: '/api/send-phone-otp',
  VERIFY_OTP: '/api/verify-otp',
  VERIFY_AADHAAR: '/api/verify-aadhaar',
  AADHAAR_DETAILS: '/api/aadhaar-details',
  OCCUPATION: '/api/occupation',
  LOAN_DETAILS: '/api/loan/details',
  LOAN_DETAILS_AUTH: (loanId: string) => `/api/loan/details/${loanId}`,
  LOAN_DETAILS_UNAUTH: (loanId: string) => `/api/loan/details/${loanId}/unauth`,
  LOAN_PERSONAL_DETAILS_UNAUTH: '/api/loan/personal-details/unauth',
  LOAN_SHG: '/api/loan/shg',
  LOAN_ADDRESS_DETAILS: '/api/loan/address-details',
  LOAN_LIST: '/api/loan/list',
  NOTIFICATION_LIST: '/api/notification/list',
  FRONTEND_DELETE_USER: '/api/user/frontend-delete',
  ASSISTANCE_DATA: '/api/assistance-data',
} as const;
