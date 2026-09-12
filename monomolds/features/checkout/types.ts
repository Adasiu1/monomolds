import type { ContractFieldErrors } from "@/lib/commerce/contracts";

export type CheckoutFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: ContractFieldErrors;
  retryable: boolean;
  refreshSummary: boolean;
  paymentUrl: string | null;
};

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  retryable: false,
  refreshSummary: false,
  paymentUrl: null,
};
