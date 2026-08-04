"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import { toErrorMessage } from "@/components/ErrorBlock";

export interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export interface UseCrudResourceConfig<T> {
  /** REST endpoint for the list/create/update, e.g. '/api/data/deities'. */
  endpoint: string;
  queryKey?: unknown[];
  parseList?: (json: unknown) => T[];
  loadErrorMessage?: string;
  getId: (item: T) => string;
  /** Return an error message to block the save, or null when the form is valid. */
  validate: (formData: Partial<T>, isCreating: boolean) => string | null;
  buildPayload?: (formData: Partial<T>) => unknown;
  /** Whether the saved record stays selected after save (false to return to the empty state, e.g. items). */
  selectAfterSave?: boolean;
  resolveSelected?: (payload: unknown, responseData: unknown, isCreating: boolean) => T;
  successMessage: (isCreating: boolean) => string;
  saveErrorMessage?: (isCreating: boolean) => string;
  deleteUrl?: (item: T) => string;
  deleteConfirmMessage: (item: T) => string;
  deleteErrorMessage?: string;
  deleteSuccessMessage: string;
  resolveAfterDelete?: (current: T | null, deletedItem: T) => T | null;
  successTimeoutMs?: number;
}

export function useCrudResource<T>(config: UseCrudResourceConfig<T>) {
  const {
    endpoint,
    queryKey = [endpoint],
    parseList = (json) => (Array.isArray(json) ? (json as T[]) : []),
    loadErrorMessage = `Failed to load ${endpoint}`,
    getId,
    validate,
    buildPayload = (formData) => formData,
    selectAfterSave = true,
    resolveSelected = (payload, responseData) => (responseData as T | undefined) ?? (payload as T),
    successMessage,
    saveErrorMessage = (isCreating) => `Failed to ${isCreating ? "create" : "update"} record`,
    deleteUrl = (item) => `${endpoint}?id=${encodeURIComponent(getId(item))}`,
    deleteConfirmMessage,
    deleteErrorMessage = "Failed to delete record",
    deleteSuccessMessage,
    resolveAfterDelete = () => null,
    successTimeoutMs = 3000,
  } = config;

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState<T | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<T>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const queryClient = useQueryClient();

  const { data: items = [], isPending: loading, error: queryError } = useQuery<T[]>({
    queryKey,
    queryFn: () => authFetch(endpoint).then((r) => {
      if (!r.ok) throw new Error(loadErrorMessage);
      return r.json().then(parseList);
    }),
  });

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), successTimeoutMs);
  };

  const handleCreate = (initial: Partial<T>) => {
    setIsCreating(true);
    setIsEditing(false);
    setSelected(null);
    setFormData(initial);
  };

  const handleEdit = (item: T) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelected(item);
    setFormData({ ...item });
  };

  const handleView = (item: T) => {
    setSelected(item);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({});
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({});
    setError("");
  };

  const handleSave = async () => {
    setError("");
    const validationError = validate(formData, isCreating);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    try {
      const payload = buildPayload(formData);
      const method = isCreating ? "POST" : "PUT";
      const res = await authFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || saveErrorMessage(isCreating));
      }
      const result = await res.json().catch(() => null) as { data?: unknown } | null;
      await queryClient.invalidateQueries({ queryKey });
      const resolved = resolveSelected(payload, result?.data, isCreating);
      setSelected(selectAfterSave ? resolved : null);
      setIsCreating(false);
      setIsEditing(false);
      showSuccess(successMessage(isCreating));
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const closeConfirm = () => setConfirmState(null);

  const handleDelete = (item: T) => {
    setConfirmState({
      message: deleteConfirmMessage(item),
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await authFetch(deleteUrl(item), { method: "DELETE" });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || deleteErrorMessage);
          }
          await queryClient.invalidateQueries({ queryKey });
          setSelected((current) => resolveAfterDelete(current, item));
          showSuccess(deleteSuccessMessage);
        } catch (e) {
          setError(toErrorMessage(e));
        }
      },
    });
  };

  return {
    items,
    loading,
    queryError,
    selected,
    setSelected,
    isEditing,
    isCreating,
    isSaving,
    formData,
    setFormData,
    searchTerm,
    setSearchTerm,
    error,
    setError,
    success,
    setSuccess,
    confirmState,
    closeConfirm,
    handleCreate,
    handleEdit,
    handleView,
    handleCancel,
    handleSave,
    handleDelete,
  };
}
