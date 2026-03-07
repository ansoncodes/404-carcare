import api from "@/services/api";
import type { MockPaymentPayload, Payment } from "@/types/payment.types";

export async function listPayments(): Promise<Payment[]> {
  const { data } = await api.get<Payment[]>("/payments/");
  return data;
}

export async function getPayment(id: string): Promise<Payment> {
  const { data } = await api.get<Payment>(`/payments/${id}/`);
  return data;
}

export async function mockPay(payload: MockPaymentPayload): Promise<{
  invoice_number: string;
  amount_paid: string | number;
  transaction_id: string;
  status: string;
}> {
  const { data } = await api.post("/payments/mock/", payload);
  return data;
}
