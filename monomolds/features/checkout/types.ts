import type { ContractFieldErrors, ItemError } from "@/lib/commerce/contracts";

export type CheckoutFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: ContractFieldErrors;
  retryable: boolean;
  refreshSummary: boolean;
  rejectedQuoteId: string | null;
  itemErrors: ItemError[];
  orderNumber: string | null;
  orderStatus: "pending_payment" | null;
  statusPath: string | null;
};

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  retryable: false,
  refreshSummary: false,
  rejectedQuoteId: null,
  itemErrors: [],
  orderNumber: null,
  orderStatus: null,
  statusPath: null,
};
