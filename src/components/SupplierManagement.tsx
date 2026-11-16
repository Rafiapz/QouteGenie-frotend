"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TruckIcon,
  PlusIcon,
  SearchIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  XIcon,
  CheckIcon,
  AlertTriangleIcon,
} from "@/components/Icons";
import {
  getSuppliers,
  createSupplier,
  Supplier,
  CreateSupplierPayload,
} from "@/services/api";

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSupplierPayload>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch suppliers on mount
  const loadSuppliers = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);
    setFetchError(null);

    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to load suppliers."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSuppliers(true);
  }, []);

  // Filter suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suppliers;

    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleOpenModal = () => {
    setFormData({ name: "", email: "", phone: "", address: "" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setFormError("Supplier name must be at least 2 characters.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const newSupplier = await createSupplier({
        name: trimmedName,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
      });

      setSuppliers((prev) => [newSupplier, ...prev]);
      setIsModalOpen(false);
      setSuccessToast(`Supplier "${newSupplier.name}" added successfully.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create supplier."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "S";
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Clean Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suppliers..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => loadSuppliers(false)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center max-w-md mx-auto">
          <AlertTriangleIcon className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-900">Unable to Load Suppliers</h3>
          <p className="text-xs text-rose-600 mt-1">{fetchError}</p>
          <button
            onClick={() => loadSuppliers(true)}
            className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
            <TruckIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Suppliers Registered</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Register your approved vendors to link quotation PDFs.
          </p>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500">
          No supplier matches &quot;{searchQuery}&quot;.{" "}
          <button
            onClick={() => setSearchQuery("")}
            className="text-indigo-600 font-semibold hover:underline ml-1"
          >
            Clear
          </button>
        </div>
      ) : (
        /* Modern Data Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px]">
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(supplier.name)}
                        </div>
                        <span className="font-semibold text-slate-900">
                          {supplier.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {supplier.email ? (
                        <a
                          href={`mailto:${supplier.email}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {supplier.email}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {supplier.phone ? (
                        <a
                          href={`tel:${supplier.phone}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {supplier.phone}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {supplier.address || <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/40 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{filteredSuppliers.length} suppliers listed</span>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-100">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Supplier</h3>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Supplier Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Apex Industrial Supplies"
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  placeholder="sales@apexsupplies.com"
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 234-5678"
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address || ""}
                  onChange={handleInputChange}
                  placeholder="Street, City, State, ZIP"
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
