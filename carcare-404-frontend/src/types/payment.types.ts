import type { BookingListRow } from "@/types/booking.types";
import type { UserMini } from "@/types/auth.types";

export interface Payment {
  id: string;
  booking: BookingListRow;
  customer: UserMini;
  invoice_number: string;
  subtotal: string;
  tax_amount: string;
  discount: string;
  total_amount: string;
  payment_method: "card" | "upi" | "cash" | "netbanking" | "wallet" | null;
  transaction_id: string | null;
  status: "pending" | "paid" | "failed" | "refunded";
  paid_at: string | null;
  created_at: string;
}

export interface MockPaymentPayload {
  booking_id: string;
  payment_method: "card" | "upi" | "cash" | "netbanking" | "wallet";
}