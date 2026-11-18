"use client";

import React, { useState, useEffect } from "react";
import {
  UploadCloudIcon,
  SparklesIcon,
  CheckIcon,
  TrashIcon,
  PlusIcon,
  AlertTriangleIcon,
} from "@/components/Icons";
import {
  getSuppliers,
  Supplier,
  uploadAndExtractQuotePdf,
  saveQuoteToApi,
  ExtractedQuoteResponse,
} from "@/services/api";
import { Quotation, QuotationLineItem } from "@/types/quotation";
import { saveQuotation } from "@/services/quotationStorage";
import { formatCurrency } from "@/utils/format";
import PlanLimitModal from "@/components/common/PlanLimitModal";

interface QuoteUploadWorkflowProps {
  onQuotationSaved: (savedQuote: Quotation) => void;
  onCancel?: () => void;
  existingQuotesCount?: number;
}

type WorkflowStep = "upload" | "extracting" | "review";

export function QuoteUploadWorkflow({
  onQuotationSaved,
  onCancel,
  existingQuotesCount,
}: QuoteUploadWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [planLimitModal, setPlanLimitModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    limitType: "uploads" | "generic";
  }>({
    isOpen: false,
    message: "",
    limitType: "uploads",
  });

  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStatusText, setExtractStatusText] = useState("");

  const [registeredSuppliers, setRegisteredSuppliers] = useState<Supplier[]>([]);

  // Verification Form State
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [deliveryLeadTime, setDeliveryLeadTime] = useState("");
  const [deliveryDays, setDeliveryDays] = useState(5);
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [items, setItems] = useState<QuotationLineItem[]>([]);
  const [taxRate, setTaxRate] = useState(18); // Default 18% GST / VAT
  const [notes, setNotes] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(96);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    getSuppliers()
      .then((data) => setRegisteredSuppliers(data))
      .catch(() => {});
  }, []);

  const handleSupplierSelect = (id: string) => {
    setSelectedSupplierId(id);
    const found = registeredSuppliers.find((s) => s.id === id);
    if (found) {
      setSupplierName(found.name);
      if (found.email) setSupplierEmail(found.email);
      if (found.phone) setSupplierPhone(found.phone);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (existingQuotesCount !== undefined && existingQuotesCount >= 4) {
      setPlanLimitModal({
        isOpen: true,
        title: "Quotation Upload Limit",
        message:
          "Free Plan limit reached: You can upload and store a maximum of 4 quotations on the Free plan. Please delete an existing quotation or upgrade your plan to upload more.",
        limitType: "uploads",
      });
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (existingQuotesCount !== undefined && existingQuotesCount >= 4) {
      if (e.target) e.target.value = "";
      setPlanLimitModal({
        isOpen: true,
        title: "Quotation Upload Limit",
        message:
          "Free Plan limit reached: You can upload and store a maximum of 4 quotations on the Free plan. Please delete an existing quotation or upgrade your plan to upload more.",
        limitType: "uploads",
      });
      return;
    }
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    if (existingQuotesCount !== undefined && existingQuotesCount >= 4) {
      setPlanLimitModal({
        isOpen: true,
        title: "Quotation Upload Limit",
        message:
          "Free Plan limit reached: You can upload and store a maximum of 4 quotations on the Free plan. Please delete an existing quotation or upgrade your plan to upload more.",
        limitType: "uploads",
      });
      return;
    }

    setFile(selectedFile);
    setStep("extracting");
    setExtractProgress(20);
    setExtractStatusText("Uploading PDF and analyzing layout...");

    try {
      const progressTimer1 = setTimeout(() => {
        setExtractProgress(50);
        setExtractStatusText("Extracting supplier information, lead times, and tables...");
      }, 500);

      const progressTimer2 = setTimeout(() => {
        setExtractProgress(85);
        setExtractStatusText("Structuring line items and calculating price totals...");
      }, 1000);

      // Call backend API to parse and extract the PDF
      const extracted: ExtractedQuoteResponse = await uploadAndExtractQuotePdf(selectedFile);

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);

      setExtractProgress(100);
      setExtractStatusText("Extraction complete! Formatting data for review...");

      // Populate form state from server extracted data
      setUploadedFileId(extracted.fileId || null);
      setQuoteNumber(extracted.quoteNumber);
      if (extracted.quoteDate) setQuoteDate(extracted.quoteDate);
      if (extracted.validUntil) setValidUntil(extracted.validUntil);
      if (extracted.currency) setCurrency(extracted.currency);
      if (extracted.deliveryLeadTime) setDeliveryLeadTime(extracted.deliveryLeadTime);
      if (extracted.paymentTerms) setPaymentTerms(extracted.paymentTerms);
      setConfidenceScore(extracted.confidenceScore || 95);

      if (extracted.supplier?.name) {
        setSupplierName(extracted.supplier.name);
        if (extracted.supplier.email) setSupplierEmail(extracted.supplier.email);
        if (extracted.supplier.phone) setSupplierPhone(extracted.supplier.phone);

        // Match with registered suppliers if possible
        const match = registeredSuppliers.find(
          (s) => s.name.toLowerCase() === extracted.supplier.name.toLowerCase()
        );
        if (match) {
          setSelectedSupplierId(match.id);
        }
      }

      // Map extracted line items
      if (extracted.items && extracted.items.length > 0) {
        setItems(
          extracted.items.map((item, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            sku: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || "units",
            unitPrice: item.price,
            totalPrice: item.totalPrice,
          }))
        );
      }

      setTimeout(() => {
        setStep("review");
      }, 400);
    } catch (err: any) {
      setStep("upload");
      const errMsg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to extract quotation from PDF.";
      if (
        err?.response?.status === 403 ||
        errMsg.toLowerCase().includes("free plan") ||
        errMsg.toLowerCase().includes("limit")
      ) {
        setPlanLimitModal({
          isOpen: true,
          title: "Quotation Upload Limit",
          message: errMsg,
          limitType: "uploads",
        });
      } else {
        alert(errMsg);
      }
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof QuotationLineItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === "quantity" || field === "unitPrice") {
        const qty = Number(field === "quantity" ? value : item.quantity) || 0;
        const price = Number(field === "unitPrice" ? value : item.unitPrice) || 0;
        item.totalPrice = Math.round(qty * price * 100) / 100;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleAddItem = () => {
    const newItem: QuotationLineItem = {
      id: `item-ext-${Date.now()}`,
      description: "",
      sku: `PART-${Math.floor(100 + Math.random() * 900)}`,
      quantity: 1,
      unit: "units",
      unitPrice: 0,
      totalPrice: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const handleVerifyAndSave = async () => {
    if (!supplierName.trim()) {
      setReviewError("Supplier name is required.");
      return;
    }
    if (!quoteNumber.trim()) {
      setReviewError("Quote number is required.");
      return;
    }
    if (items.length === 0) {
      setReviewError("At least one line item is required.");
      return;
    }

    setIsSaving(true);
    setReviewError(null);

    try {
      // 1. Save quote to PostgreSQL database via backend API
      const savedInDb = await saveQuoteToApi({
        supplierId: selectedSupplierId || undefined,
        supplierName: supplierName.trim(),
        quoteNumber: quoteNumber.trim(),
        quoteDate: quoteDate || new Date().toISOString().split("T")[0],
        validUntil: validUntil || null,
        currency,
        deliveryLeadTime: deliveryLeadTime || `${deliveryDays} business days`,
        paymentTerms,
        totalAmount,
        taxAmount,
        notes,
        uploadedFileId: uploadedFileId || undefined,
        lines: items.map((i) => ({
          partNumber: i.sku || `PART-${Math.floor(100 + Math.random() * 900)}`,
          description: i.description,
          quantity: i.quantity,
          unit: i.unit,
          price: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      });

      // 2. Prepare quotation object for frontend state
      const newQuotation: Quotation = {
        id: savedInDb.id,
        quoteNumber: savedInDb.quoteNumber,
        supplierId: savedInDb.supplierId,
        supplierName: supplierName.trim(),
        supplierEmail: supplierEmail.trim() || null,
        supplierPhone: supplierPhone.trim() || null,
        items,
        subtotal,
        tax: taxAmount,
        totalAmount,
        deliveryLeadTime: deliveryLeadTime || `${deliveryDays} business days`,
        deliveryDays,
        validUntil: validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        paymentTerms,
        notes,
        status: "verified",
        confidenceScore,
        fileName: file ? file.name : "Quotation_Uploaded.pdf",
        fileSize: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        createdAt: new Date().toISOString(),
      };

      saveQuotation(newQuotation);
      onQuotationSaved(newQuotation);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save quotation to database.";
      if (
        err?.response?.status === 403 ||
        errMsg.toLowerCase().includes("free plan") ||
        errMsg.toLowerCase().includes("limit")
      ) {
        setPlanLimitModal({
          isOpen: true,
          title: "Quotation Upload Limit",
          message: errMsg,
          limitType: "uploads",
        });
      } else {
        setReviewError(errMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Step 1: Upload Dropzone */}
      {step === "upload" && (
        <div className="p-8 sm:p-12 text-center">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all ${
              isDragging
                ? "border-indigo-600 bg-indigo-50/40"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
              <UploadCloudIcon className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Upload Quotation PDF
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Drag &amp; drop a supplier quotation PDF here, or click to browse. The system will extract line items, prices, and terms automatically.
            </p>

            <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Select Quotation PDF</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          </div>
        </div>
      )}

      {/* Step 2: Extracting State */}
      {step === "extracting" && (
        <div className="p-12 text-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
            <SparklesIcon className="w-6 h-6 animate-spin" />
          </div>

          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Extracting Quotation Data
          </h4>
          <p className="text-xs text-slate-500 mb-4 font-mono min-h-[1.25rem]">
            {extractStatusText}
          </p>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${extractProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 3: Review & Verification Editor */}
      {step === "review" && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Review Extracted Data</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {confidenceScore}% AI Confidence
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Verify the extracted supplier information, line items, and terms below before saving.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-100 text-slate-600 truncate max-w-[200px]" title={file?.name}>
              {file?.name || "Quotation.pdf"}
            </span>
          </div>

          {reviewError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {reviewError}
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Supplier Name <span className="text-rose-500">*</span>
              </label>
              {registeredSuppliers.length > 0 ? (
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">Select registered supplier...</option>
                  {registeredSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : null}

              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Supplier name"
                className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Quote Reference # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                placeholder="QTE-2026-1002"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Quote Date
              </label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Delivery Lead Time
              </label>
              <input
                type="text"
                value={deliveryLeadTime}
                onChange={(e) => setDeliveryLeadTime(e.target.value)}
                placeholder="e.g. 5-7 business days"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Estimated Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Extracted Line Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="border border-slate-200/80 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-semibold border-b border-slate-200/80">
                    <th className="py-2 px-3 w-28">Part # / SKU</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-2 w-20 text-right">Qty</th>
                    <th className="py-2 px-2 w-16 text-center">Unit</th>
                    <th className="py-2 px-2 w-24 text-right">Unit Price</th>
                    <th className="py-2 px-3 w-28 text-right">Total</th>
                    <th className="py-2 px-1 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={item.sku || ""}
                          onChange={(e) => handleItemChange(idx, "sku", e.target.value)}
                          placeholder="SKU"
                          className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono focus:border-indigo-600"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="Description"
                          className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:border-indigo-600"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="w-full px-1 py-1 rounded border border-slate-200 text-xs text-center"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                          className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.totalPrice)}
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-300 hover:text-rose-500 p-0.5"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Submit */}
          <div className="pt-2 flex flex-col sm:flex-row justify-between items-end gap-3 border-t border-slate-100">
            <div className="w-full sm:w-64 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax ({taxRate}%):</span>
                <span className="font-mono text-slate-900">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total ({currency}):</span>
                <span className="font-mono text-indigo-600 text-sm">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleVerifyAndSave}
                disabled={isSaving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSaving ? "Saving to Database..." : "Save & Store Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Limit Modal for Free Plan Upload Limits */}
      <PlanLimitModal
        isOpen={planLimitModal.isOpen}
        onClose={() => {
          setPlanLimitModal((prev) => ({ ...prev, isOpen: false }));
          onCancel?.();
        }}
        title={planLimitModal.title}
        message={planLimitModal.message}
        limitType={planLimitModal.limitType}
        onManageQuotations={onCancel}
      />
    </div>
  );
}
