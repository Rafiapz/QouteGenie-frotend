export interface QuotationLineItem {
  id: string;
  description: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  supplierId: string;
  supplierName: string;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  items: QuotationLineItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  deliveryLeadTime: string;
  deliveryDays: number;
  validUntil: string;
  paymentTerms: string;
  notes?: string;
  status: "verified" | "review_pending";
  confidenceScore: number;
  fileName?: string;
  fileSize?: string;
  createdAt: string;
}

export interface QuotationComparisonSummary {
  cheapestQuoteId: string;
  fastestDeliveryQuoteId: string;
  maxSavingsAmount: number;
  maxSavingsPercent: number;
  itemPriceVariances: {
    itemDescription: string;
    lowestPrice: number;
    highestPrice: number;
    lowestSupplierName: string;
    variancePercent: number;
  }[];
}

export interface QuoteComparisonRecord {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  quoteIds: string[];
  createdAt: string;
  updatedAt: string;
}
