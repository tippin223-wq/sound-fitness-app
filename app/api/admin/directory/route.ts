import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type DirectoryStage = "appUsers" | "coaches";

type DirectoryRecord = {
  addedAt: string;
  details: Record<string, string>;
  id: string;
  isLiveDirectory: true;
  name: string;
  profile: Record<string, string>;
  reached: string;
  stage: DirectoryStage;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  return scheme.toLowerCase() === "bearer" && token ? token : null;
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function getCustomerDetails(customer: Stripe.Subscription["customer"]) {
  if (!customer || typeof customer === "string" || customer.deleted) {
    return { email: "", name: "" };
  }

  return { email: customer.email ?? "", name: customer.name ?? "" };
}

export async function GET(request: Request) {
  const token = getBearerToken(request);

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Admin authorization is required." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Your admin session could not be verified." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "Only admin accounts can view the directory." }, { status: 403 });
  }

  const records: DirectoryRecord[] = [];

  try {
    const subscriptions = await getStripeClient().subscriptions.list({
      expand: ["data.customer"],
      limit: 100,
      status: "all",
    });
    const activeStatuses = new Set(["active", "past_due", "trialing"]);
    const seenCustomers = new Set<string>();

    subscriptions.data.forEach((subscription) => {
      if (!activeStatuses.has(subscription.status)) return;

      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      if (seenCustomers.has(customerId)) return;
      seenCustomers.add(customerId);

      const customer = getCustomerDetails(subscription.customer);
      const email = customer.email || "Email unavailable";
      const name = customer.name || customer.email || "Member";

      records.push({
        addedAt: formatDate(subscription.created),
        details: {
          email,
          lastActive: "Subscription current",
          note: "Live Stripe subscription record.",
          plan: subscription.metadata.planName ?? "Online Coaching",
          role: "Member",
          status: subscription.status.replace(/_/g, " "),
        },
        id: `stripe-${subscription.id}`,
        isLiveDirectory: true,
        name,
        profile: { email },
        reached: "Live",
        stage: "appUsers",
      });
    });
  } catch (error) {
    console.error("[admin/directory] Stripe directory lookup failed:", error);
  }

  if (serviceRoleKey) {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: usersData, error: usersError } =
      await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });

    if (!usersError && usersData.users.length) {
      const userIds = usersData.users.map((entry) => entry.id);
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, role, email, full_name, phone, status, last_seen_at")
        .in("id", userIds);
      const profilesByUserId = new Map(
        (profiles ?? []).map((entry) => [entry.id, entry]),
      );
      const liveMemberEmails = new Set(
        records
          .filter((record) => record.stage === "appUsers")
          .map((record) => record.profile.email.toLowerCase())
          .filter(Boolean),
      );

      usersData.users
        .filter((entry) => profilesByUserId.get(entry.id)?.role === "member")
        .forEach((entry) => {
          const profile = profilesByUserId.get(entry.id);
          const metadata = entry.user_metadata ?? {};
          const email = profile?.email ?? entry.email ?? "Email unavailable";
          if (liveMemberEmails.has(email.toLowerCase())) return;

          const name =
            profile?.full_name ??
            (typeof metadata.full_name === "string"
              ? metadata.full_name
              : entry.email ?? "Member");

          records.push({
            addedAt: formatDate(
              Math.floor(new Date(entry.created_at).getTime() / 1000),
            ),
            details: {
              email,
              lastActive: profile?.last_seen_at ?? "Not captured",
              note: "Live Sound Fitness member account.",
              plan: "No live subscription",
              role: "Member",
              status: profile?.status ?? "active",
            },
            id: `supabase-member-${entry.id}`,
            isLiveDirectory: true,
            name,
            profile: { email, phone: profile?.phone ?? "" },
            reached: "Live",
            stage: "appUsers",
          });
        });

      usersData.users
        .filter((entry) => profilesByUserId.get(entry.id)?.role === "coach")
        .forEach((entry) => {
          const profile = profilesByUserId.get(entry.id);
          const metadata = entry.user_metadata ?? {};
          const name =
            profile?.full_name ??
            (typeof metadata.full_name === "string"
              ? metadata.full_name
              : entry.email ?? "Coach");
          const email = profile?.email ?? entry.email ?? "Email unavailable";

          records.push({
            addedAt: formatDate(
              Math.floor(new Date(entry.created_at).getTime() / 1000),
            ),
            details: {
              availability: "Not captured",
              note: "Live Sound Fitness coach account.",
              role: "Coach",
              specialty: "Not captured",
              status: profile?.status ?? "active",
            },
            id: `supabase-coach-${entry.id}`,
            isLiveDirectory: true,
            name,
            profile: { email, phone: profile?.phone ?? "" },
            reached: "Live",
            stage: "coaches",
          });
        });
    }
  }

  return NextResponse.json({ records });
}
