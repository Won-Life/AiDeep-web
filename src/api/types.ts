export type ApiResponse<T> =
  | {
      resultType: string;
      error: null;
      success: T;
    }
  | {
      resultType: string;
      error: {
        code: string;
        message: string;
      };
      success: null;
    };
