import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_CHECKOUT_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions";

export async function POST() {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No se encontró una sesión activa." }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "El usuario autenticado no tiene email." }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const boostMonthlyPriceId = process.env.STRIPE_BOOST_MONTHLY_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Falta STRIPE_SECRET_KEY." }, { status: 500 });
  }

  if (!boostMonthlyPriceId) {
    return NextResponse.json({ error: "Falta STRIPE_BOOST_MONTHLY_PRICE_ID." }, { status: 500 });
  }

  if (!appUrl) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_APP_URL." }, { status: 500 });
  }

  const body = new URLSearchParams({
    mode: "subscription",
    "payment_method_types[0]": "card",
    customer_email: user.email,
    "line_items[0][price]": boostMonthlyPriceId,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/dashboard?boost=success`,
    cancel_url: `${appUrl}/dashboard?boost=cancel`,
    "metadata[owner_user_id]": user.id,
    "metadata[owner_email]": user.email,
    "metadata[product]": "taplytap_boost"
  });

  const stripeResponse = await fetch(STRIPE_CHECKOUT_SESSIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  const session = (await stripeResponse.json()) as { url?: string; error?: { message?: string } };

  if (!stripeResponse.ok || !session.url) {
    return NextResponse.json(
      { error: session.error?.message ?? "No se pudo crear la sesión de Stripe." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
