import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { VehiclePicker } from "@/components/booking/VehiclePicker";
import { Button } from "@/components/ui/button";

export default function BookVehiclePage() {
  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="New Booking" subtitle="Step 1: Pick or add a vehicle" />
      <BookingSteps current={1} />
      <VehiclePicker />
      <div className="flex justify-end">
        <Link href="/book/airport">
          <Button size="lg">Continue</Button>
        </Link>
      </div>
    </section>
  );
}
