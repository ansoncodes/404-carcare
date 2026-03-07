import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { ParkingPicker } from "@/components/booking/ParkingPicker";
import { Button } from "@/components/ui/button";

export default function BookParkingPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="New Booking" subtitle="Step 5: Optional parking" />
      <BookingSteps current={5} />
      <ParkingPicker />
      <div className="flex justify-between">
        <Link href="/book/slot">
          <Button variant="secondary">Back</Button>
        </Link>
        <Link href="/book/confirm">
          <Button>Next</Button>
        </Link>
      </div>
    </section>
  );
}
