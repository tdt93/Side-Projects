import { redirect } from "next/navigation";

/** @deprecated — użyj /admin/clients lub /admin/bookings */
export default function MyBookingsRedirectPage() {
  redirect("/admin/clients");
}
