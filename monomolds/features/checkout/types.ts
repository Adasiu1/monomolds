import type { ContractFieldErrors } from "@/lib/commerce/contracts";

export type CheckoutFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: ContractFieldErrors;
  retryable: boolean;
  refreshSummary: boolean;
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
  orderNumber: null,
  orderStatus: null,
  statusPath: null,
};
