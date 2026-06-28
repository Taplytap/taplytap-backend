import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BoostSubscriptionStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEvent<T = Record<string, unknown>> = {
  id: string;
  type: string;
  data: {
    object: T;
  };
};

type StripeCheckoutSession = {
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  metadata?: {
    product?: string | null;
    owner_user_id?: string | null;
    owner_email?: string | null;
  } | null;
};

type StripeInvoice = {
  subscription?: string | { id?: string } | null;
};

type StripeSubscription = {
  id?: string | null;
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 500 });
  }

  if (!isValidStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 401 });
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe payload." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(supabase, event as StripeEvent<StripeCheckoutSession>);
    }

    if (event.type === "invoice.paid") {
      await updateSubscriptionStatusByStripeSubscriptionId(
        supabase,
        getStripeId((event as StripeEvent<StripeInvoice>).data.object.subscription),
        "active"
      );
    }

    if (event.type === "invoice.payment_failed") {
      await updateSubscriptionStatusByStripeSubscriptionId(
        supabase,
        getStripeId((event as StripeEvent<StripeInvoice>).data.object.subscription),
        "past_due"
      );
    }

    if (event.type === "customer.subscription.deleted") {
      await updateSubscriptionStatusByStripeSubscriptionId(
        supabase,
        (event as StripeEvent<StripeSubscription>).data.object.id ?? null,
        "canceled"
      );
    }
  } catch (error) {
    logServerError("/api/webhooks/stripe process event", error);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  event: StripeEvent<StripeCheckoutSession>
) {
  const session = event.data.object;

  if (session.metadata?.product !== "taplytap_boost") {
    return;
  }

  const userId = session.metadata.owner_user_id;
  const email = normalizeEmail(session.metadata.owner_email);

  if (!userId || !email) {
    return;
  }

  const { error } = await supabase.from("boost_subscriptions").upsert(
    {
      user_id: userId,
      email,
      status: "active",
      source: "stripe",
      stripe_customer_id: getStripeId(session.customer),
      stripe_subscription_id: getStripeId(session.subscription),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

async function updateSubscriptionStatusByStripeSubscriptionId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  stripeSubscriptionId: string | null,
  status: BoostSubscriptionStatus
) {
  if (!stripeSubscriptionId) {
    return;
  }

  const { error } = await supabase
    .from("boost_subscriptions")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    throw error;
  }
}

function isValidStripeSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  const signatureParts = parseStripeSignatureHeader(signatureHeader);

  if (!signatureParts.timestamp || signatureParts.signatures.length === 0) {
    return false;
  }

  const signedPayload = `${signatureParts.timestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  return signatureParts.signatures.some((signature) => timingSafeHexEqual(signature, expectedSignature));
}

function parseStripeSignatureHeader(signatureHeader: string | null) {
  const result: { timestamp: string | null; signatures: string[] } = {
    timestamp: null,
    signatures: []
  };

  if (!signatureHeader) {
    return result;
  }

  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");

    if (key === "t") {
      result.timestamp = value ?? null;
    }

    if (key === "v1" && value) {
      result.signatures.push(value);
    }
  }

  return result;
}

function timingSafeHexEqual(value: string, expectedValue: string) {
  const valueBuffer = Buffer.from(value, "hex");
  const expectedBuffer = Buffer.from(expectedValue, "hex");

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function getStripeId(value: string | { id?: string } | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id ?? null;
}

function normalizeEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
