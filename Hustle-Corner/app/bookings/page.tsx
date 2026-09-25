import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBuyerAppointments } from "@/lib/appointments";
import BuyerAppointmentRow from "@/components/BuyerAppointmentRow";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const appointments = await getBuyerAppointments(user.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <h1 className="mb-6 text-2xl font-bold">My bookings</h1>

      {appointments.length > 0 ? (
        <ul className="space-y-2">
          {appointments.map((a) => (
            <BuyerAppointmentRow key={a.id} appointment={a} />
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">
          No bookings yet.{" "}
          <Link href="/" className="font-medium text-brand-600">
            Browse sellers
          </Link>{" "}
          to request an appointment.
        </p>
      )}
    </main>
  );
}
