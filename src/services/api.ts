const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export interface RegisterOrganizationPayload {
  email: string;
  companyName: string;
  password: string;
  plan?: number;
}

export interface RegisteredOrganization {
  id: string;
  email: string;
  companyName: string;
  plan: number;
  createdAt: string;
  updatedAt: string;
  token?: string;
  tokenType?: string;
  expiresIn?: string;
}

export interface RegisterOrganizationSuccessResponse {
  success: true;
  message: string;
  data: RegisteredOrganization;
}

export interface LoginOrganizationPayload {
  email: string;
  password: string;
}

export interface LoggedInOrganization {
  id: string;
  email: string;
  companyName: string;
  plan: number;
  createdAt: string;
  token?: string;
  tokenType?: string;
  expiresIn?: string;
}

export interface LoginOrganizationSuccessResponse {
  success: true;
  message: string;
  data: LoggedInOrganization;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: ApiErrorDetail[];
}

export async function registerOrganization(
  payload: RegisterOrganizationPayload
): Promise<RegisterOrganizationSuccessResponse> {
  const url = `${API_BASE_URL}/organizations/register`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include", // Receives and stores HTTP-only cookie automatically
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the backend server. Please check if the server is running."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    if (data.details && Array.isArray(data.details)) {
      const messages = data.details
        .map((d: ApiErrorDetail) => d.message)
        .join("; ");
      throw new Error(messages || data.error || "Validation error");
    }
    throw new Error(data.error || "Failed to register organization.");
  }

  return data as RegisterOrganizationSuccessResponse;
}

export async function loginOrganization(
  payload: LoginOrganizationPayload
): Promise<LoginOrganizationSuccessResponse> {
  const url = `${API_BASE_URL}/organizations/login`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include", // Receives and stores HTTP-only cookie automatically
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the backend server. Please check if the server is running."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    if (data.details && Array.isArray(data.details)) {
      const messages = data.details
        .map((d: ApiErrorDetail) => d.message)
        .join("; ");
      throw new Error(messages || data.error || "Validation error");
    }
    throw new Error(data.error || "Invalid email or password.");
  }

  return data as LoginOrganizationSuccessResponse;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("quotegenie_token");
}

export async function fetchCurrentProfile(): Promise<LoggedInOrganization | null> {
  const token = getStoredToken();

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/me`, {
      credentials: "include", // Sends HTTP-only cookie automatically
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function logoutOrganization(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/organizations/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network error on logout
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("quotegenie_user");
    localStorage.removeItem("quotegenie_token");
  }
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  organizationId: string;
}

export interface CreateSupplierPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch suppliers.");
  }
  return data.data || [];
}

export async function createSupplier(
  payload: CreateSupplierPayload
): Promise<Supplier> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.details && Array.isArray(data.details)) {
      const messages = data.details
        .map((d: ApiErrorDetail) => d.message)
        .join("; ");
      throw new Error(messages || data.error || "Validation error");
    }
    throw new Error(data.error || "Failed to create supplier.");
  }
  return data.data;
}

export interface ExtractedLineItemDto {
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  totalPrice: number;
}

export interface ExtractedQuoteResponse {
  fileId?: string;
  fileName: string;
  fileSize: number;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string | null;
  status: number;
  currency: string;
  deliveryLeadTime: string | null;
  paymentTerms: string | null;
  supplier: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  items: ExtractedLineItemDto[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  confidenceScore: number;
}

export interface SaveQuotePayload {
  supplierId?: string;
  supplierName: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil?: string | null;
  currency?: string;
  deliveryLeadTime?: string | null;
  paymentTerms?: string | null;
  totalAmount?: number | null;
  taxAmount?: number | null;
  notes?: string | null;
  uploadedFileId?: string | null;
  lines: {
    partNumber: string;
    description?: string | null;
    quantity: number;
    unit: string;
    price: number;
    totalPrice?: number;
  }[];
}

export async function uploadAndExtractQuotePdf(file: File): Promise<ExtractedQuoteResponse> {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/quotes/extract`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to extract quotation PDF.");
  }
  return data.data;
}

export async function saveQuoteToApi(payload: SaveQuotePayload) {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/quotes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.details && Array.isArray(data.details)) {
      const messages = data.details.map((d: ApiErrorDetail) => d.message).join("; ");
      throw new Error(messages || data.error || "Validation error");
    }
    throw new Error(data.error || "Failed to save quotation.");
  }
  return data.data;
}

export async function getQuotesFromApi() {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/quotes`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    return [];
  }
  return data.data || [];
}

export async function deleteQuoteFromApi(id: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/quotes/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete quotation.");
  }
}

export interface RiskItem {
  level: "low" | "medium" | "high";
  title: string;
  description: string;
  affectedSupplier: string;
}

export interface NegotiationLeveragePoint {
  supplierName: string;
  quoteNumber: string;
  leveragePoint: string;
  recommendedAction: string;
  potentialImpact: string;
  draftEmailSnippet?: string;
}

export interface SupplierScorecard {
  supplierName: string;
  quoteNumber: string;
  overallScore: number;
  priceScore: number;
  deliveryScore: number;
  termsScore: number;
  riskScore: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SplitSourcingAllocation {
  supplierName: string;
  itemDescription: string;
  suggestedQty: number;
  unitPrice: number;
  savingsVsHighest: number;
}

export interface SplitSourcingOpportunity {
  isRecommended: boolean;
  summary: string;
  potentialSavings: number;
  allocations: SplitSourcingAllocation[];
}

export interface IntelligentAnalysisResult {
  summary: string;
  recommendedSupplierName: string;
  recommendationReason: string;
  projectedSavings: number;
  strategicActionPlan: string[];
  splitSourcing: SplitSourcingOpportunity;
  riskAnalysis: RiskItem[];
  negotiationPoints: NegotiationLeveragePoint[];
  supplierScores: SupplierScorecard[];
  analyzedQuotesCount: number;
  generatedAt: string;
  isCached?: boolean;
  cacheExpiresInHours?: number;
}

export async function analyzeQuotesWithAi(
  quoteIds?: string[],
  forceRefresh: boolean = false
): Promise<IntelligentAnalysisResult> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/quotes/analyze`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ quoteIds, forceRefresh }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Failed to generate AI quotation analysis.");
  }
  return data.data;
}
