from django.db import models

import uuid as _uuid

from apps.core.models import BaseModel


def generate_invoice_number():
    return f"INV-{_uuid.uuid4().hex[:8].upper()}"


class Payment(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class PaymentMethod(models.TextChoices):
        CARD = "card", "Card"
        UPI = "upi", "UPI"
        CASH = "cash", "Cash"
        NETBANKING = "netbanking", "Net Banking"
        WALLET = "wallet", "Wallet"

    booking = models.OneToOneField("bookings.Booking", on_delete=models.CASCADE, related_name="payment")
    customer = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="payments")
    invoice_number = models.CharField(max_length=20, unique=True, default=generate_invoice_number)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, null=True, blank=True)
    transaction_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.invoice_number} — ₹{self.total_amount} ({self.status})"

    def save(self, *args, **kwargs):
        self.tax_amount = round(float(self.subtotal) * 0.18, 2)
        self.total_amount = float(self.subtotal) + self.tax_amount - float(self.discount)
        super().save(*args, **kwargs)
