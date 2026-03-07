"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { mockPay } from "@/services/payments.service";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface MockPayModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
}

export function MockPayModal({ open, onClose, bookingId }: MockPayModalProps) {
  const [method, setMethod] = useState<"card" | "upi" | "cash" | "netbanking" | "wallet">("upi");

  const mutation = useMutation({
    mutationFn: () => mockPay({ booking_id: bookingId, payment_method: method }),
    onSuccess: () => onClose(),
  });

  return (
    <Modal open={open} onClose={onClose} title="Mock Payment">
      <div className="space-y-4">
        <select
          className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          value={method}
          onChange={(event) => setMethod(event.target.value as "card" | "upi" | "cash" | "netbanking" | "wallet")}
        >
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="netbanking">Net Banking</option>
          <option value="wallet">Wallet</option>
        </select>
        <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Processing..." : "Pay"}
        </Button>
      </div>
    </Modal>
  );
}
