import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { ServicePicker } from "@/components/booking/ServicePicker";
import { Button } from "@/components/ui/button";

export default function BookServicesPage() {
  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="New Booking" subtitle="Step 3: Choose services" />
      <BookingSteps current={3} />
      <ServicePicker />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/book/airport">
          <Button variant="secondary" size="lg">
            Back
          </Button>
        </Link>
        <Link href="/book/slot">
          <Button size="lg">Continue</Button>
        </Link>
      </div>
    </section>
  );
}
