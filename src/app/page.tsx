import { redirect } from "next/navigation";

export default function RootPage() {
  // Since we implemented smart role-based routing inside the unified login page,
  // the old role-selection landing page is no longer needed.
  // We instantly redirect everyone to the secure login portal.
  redirect("/login");
}
