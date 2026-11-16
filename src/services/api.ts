import { apiClient, API_BASE_URL } from "./apiClient";
import { QuoteComparisonRecord } from "@/types/quotation";

export { apiClient, API_BASE_URL };

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

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("quotegenie_token");
}

export async function registerOrganization(
  payload: RegisterOrganizationPayload
): Promise<RegisterOrganizationSuccessResponse> {
  const response = await apiClient.post<RegisterOrganizationSuccessResponse>(
    "/organizations/register",
    payload
  );
  return response.data;
}

export async function loginOrganization(
  payload: LoginOrganizationPayload
): Promise<LoginOrganizationSuccessResponse> {
  const response = await apiClient.post<LoginOrganizationSuccessResponse>(
    "/organizations/login",
    payload
  );
  return response.data;
}

export async function fetchCurrentProfile(): Promise<LoggedInOrganization | null> {
  try {
    const response = await apiClient.get<{ success: true; data: LoggedInOrganization }>(
      "/organizations/me"
    );
    return response.data.data;
  } catch {
    return null;
  }
}

export async function logoutOrganization(): Promise<void> {
  try {
    await apiClient.post("/organizations/logout");
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
  const response = await apiClient.get<{ success: true; data: Supplier[] }>("/suppliers");
  return response.data.data || [];
}

export async function createSupplier(
  payload: CreateSupplierPayload
): Promise<Supplier> {
  const response = await apiClient.post<{ success: true; data: Supplier }>(
    "/suppliers",
    payload
  );
  return response.data.data;
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
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ success: true; data: ExtractedQuoteResponse }>(
    "/quotes/extract",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data.data;
}

export async function saveQuoteToApi(payload: SaveQuotePayload) {
  const response = await apiClient.post<{ success: true; data: any }>(
    "/quotes",
    payload
  );
  return response.data.data;
}

export async function getQuotesFromApi() {
  try {
    const response = await apiClient.get<{ success: true; data: any[] }>("/quotes");
    return response.data.data || [];
  } catch {
    return [];
  }
}

export async function deleteQuoteFromApi(id: string): Promise<void> {
  await apiClient.delete(`/quotes/${id}`);
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
  missingItems?: string[];
  missingItemsCount?: number;
  totalScopeItemsCount?: number;
  itemCoveragePercent?: number;
  scopePenalized?: boolean;
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
  const response = await apiClient.post<{ success: true; data: IntelligentAnalysisResult }>(
    "/quotes/analyze",
    { quoteIds, forceRefresh }
  );
  return response.data.data;
}

export interface CreateComparisonPayload {
  name: string;
  description?: string;
  quoteIds: string[];
}

export interface UpdateComparisonPayload {
  name?: string;
  description?: string;
  quoteIds?: string[];
}

export async function getComparisonsFromApi(): Promise<QuoteComparisonRecord[]> {
  const response = await apiClient.get<{ success: true; data: QuoteComparisonRecord[] }>(
    "/comparisons"
  );
  return response.data.data || [];
}

export async function createComparisonInApi(
  payload: CreateComparisonPayload
): Promise<QuoteComparisonRecord> {
  const response = await apiClient.post<{ success: true; data: QuoteComparisonRecord }>(
    "/comparisons",
    payload
  );
  return response.data.data;
}

export async function updateComparisonInApi(
  id: string,
  payload: UpdateComparisonPayload
): Promise<QuoteComparisonRecord> {
  const response = await apiClient.put<{ success: true; data: QuoteComparisonRecord }>(
    `/comparisons/${id}`,
    payload
  );
  return response.data.data;
}

export async function deleteComparisonFromApi(id: string): Promise<void> {
  await apiClient.delete(`/comparisons/${id}`);
}

export async function analyzeComparisonWithAi(
  comparisonId: string,
  forceRefresh: boolean = false,
  quoteIds?: string[]
): Promise<IntelligentAnalysisResult> {
  const response = await apiClient.post<{ success: true; data: IntelligentAnalysisResult }>(
    `/comparisons/${comparisonId}/analyze`,
    { forceRefresh, quoteIds }
  );
  return response.data.data;
}
