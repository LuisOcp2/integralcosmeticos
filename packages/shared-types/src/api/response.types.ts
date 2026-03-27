export interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    perPage: number;
  };
}

export interface IApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
}
