import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

/**
 * Pre-configured Axios client instance for all QuoteGenie API communications.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Sends and accepts HTTP-only cookies
  timeout: 60000,        // 60-second timeout for AI extraction & LLM analysis
  headers: {
    Accept: "application/json",
  },
});

/**
 * 1. Axios Request Middleware (Interceptor):
 * Injects Bearer token automatically from localStorage and manages headers.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("quotegenie_token");
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 2. Axios Response Middleware (Interceptor):
 * Handles HTTP status codes, extracts detailed validation errors,
 * formats rate-limiting messages, and handles session expiration.
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<any>) => {
    // 1. Session Expiration handling (HTTP 401)
    if (typeof window !== "undefined" && error.response?.status === 401) {
      const path = window.location.pathname;
      const isPublicPath = path === "/login" || path === "/register" || path === "/";
      if (!isPublicPath) {
        localStorage.removeItem("quotegenie_token");
        localStorage.removeItem("quotegenie_user");
        window.location.href = "/login";
      }
    }

    // 2. Extract detailed server error message
    const resData = error.response?.data;
    let message = "An unexpected error occurred while communicating with the server.";

    if (resData) {
      if (resData.details && Array.isArray(resData.details)) {
        message = resData.details.map((d: any) => d.message).join("; ");
      } else if (resData.message) {
        message = resData.message;
      } else if (resData.error) {
        message = typeof resData.error === "string" ? resData.error : JSON.stringify(resData.error);
      }
    } else if (error.message) {
      if (error.code === "ECONNABORTED") {
        message = "Request timed out. The server took too long to complete the AI analysis.";
      } else if (error.message === "Network Error") {
        message = "Unable to connect to the backend server. Please verify the backend is running at http://localhost:5000.";
      } else {
        message = error.message;
      }
    }

    const enhancedError = new Error(message);
    (enhancedError as any).status = error.response?.status;
    (enhancedError as any).data = error.response?.data;
    (enhancedError as any).code = error.code;
    (enhancedError as any).originalError = error;

    return Promise.reject(enhancedError);
  }
);
