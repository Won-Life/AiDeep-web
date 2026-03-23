export type ApiResponse<T> =
  | {
      resultType: 'SUCCESS';
      error: null;
      success: T;
    }
  | {
      resultType: 'FAIL';
      error: {
        errorCode: string;
        reason: string;
        data: string;
      };
      success: null;
    };

export class ApiError extends Error {
  constructor(
    public errorCode: string,
    public reason: string,
    public data: string,
  ) {
    super(reason);
    this.name = 'ApiError';
  }
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface EmailSendRequest {
  email: string;
}

export interface EmailVerifyRequest {
  email: string;
  code: number;
}
