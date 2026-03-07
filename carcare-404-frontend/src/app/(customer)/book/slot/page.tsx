import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { Button } from "@/components/ui/button";

export default function BookSlotPage() {
  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="New Booking" subtitle="Step 4: Pick time slot" />
      <BookingSteps current={4} />
      <SlotPicker />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/book/services">
          <Button variant="secondary" size="lg">
            Back
          </Button>
        </Link>
        <Link href="/book/parking">
          <Button size="lg">Continue</Button>
        </Link>
      </div>
    </section>
  );
}
