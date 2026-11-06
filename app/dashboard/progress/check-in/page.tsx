import { redirect } from "next/navigation";

export default function CheckInRedirect() {
  redirect("/dashboard?checkIn=daily");
}
