import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShopifyLineItem = {
  product_id?: number | string | null;
  variant_id?: number | string | null;
};

type ShopifyNoteAttribute = {
  name?: string | null;
  value?: string | null;
};

type ShopifyOrderPayload = {
  id?: number | string | null;
  email?: string | null;
  contact_email?: string | null;
  customer?: {
    id?: number | string | null;
    email?: string | null;
  } | null;
  line_items?: ShopifyLineItem[];
  note_attributes?: ShopifyNoteAttribute[] | Record<string, unknown> | null;
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const topic = request.headers.get("x-shopify-topic") ?? "";
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  logShopifyWebhookStep("received", {
    topic,
    webhookId: webhookId ?? "missing",
    shopDomain: shopDomain ?? "missing",
    bodyBytes: rawBody.length
  });

  if (!isValidShopifyHmac(rawBody, request.headers.get("x-shopify-hmac-sha256"))) {
    logShopifyWebhookStep("return_invalid_hmac", {
      topic,
      webhookId: webhookId ?? "missing"
    });
    return NextResponse.json({ error: "Invalid Shopify webhook signature." }, { status: 401 });
  }

  if (!webhookId) {
    logShopifyWebhookStep("return_missing_webhook_id", { topic });
    return NextResponse.json({ error: "Missing Shopify webhook id." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error: eventError } = await supabase.from("shopify_webhook_events").insert({
    id: webhookId,
    topic,
    shop_domain: shopDomain
  });

  if (eventError) {
    if (eventError.code === "23505") {
      logShopifyWebhookStep("return_duplicate_webhook", {
        topic,
        webhookId
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }

    logShopifyWebhookStep("return_idempotency_insert_failed", {
      topic,
      webhookId,
      error: eventError.message
    });
    logServerError("/api/webhooks/shopify idempotency insert", eventError);
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  if (topic !== "orders/paid") {
    logShopifyWebhookStep("return_ignored_topic", {
      topic,
      webhookId
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  let payload: ShopifyOrderPayload;

  try {
    payload = JSON.parse(rawBody) as ShopifyOrderPayload;
  } catch {
    logShopifyWebhookStep("return_invalid_json", {
      topic,
      webhookId
    });
    return NextResponse.json({ error: "Invalid Shopify payload." }, { status: 400 });
  }

  try {
    logShopifyWebhookStep("order_payload_summary", {
      webhookId,
      orderId: toNullableString(payload.id) ?? "missing",
      customerId: toNullableString(payload.customer?.id) ?? "missing",
      lineItems: readLineItemIds(payload)
    });

    const includesBoost = orderIncludesBoost(payload);
    logShopifyWebhookStep("boost_detection", {
      webhookId,
      detected: includesBoost,
      configuredProductId: process.env.SHOPIFY_BOOST_PRODUCT_ID?.trim() ? "configured" : "missing",
      configuredVariantId: process.env.SHOPIFY_BOOST_VARIANT_ID?.trim() ? "configured" : "missing"
    });

    if (!includesBoost) {
      logShopifyWebhookStep("return_ignored_non_boost_order", {
        webhookId,
        orderId: toNullableString(payload.id) ?? "missing"
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    const email = readShopifyEmail(payload);
    logShopifyWebhookStep("email_detected", {
      webhookId,
      email: email ?? "missing"
    });

    if (!email) {
      logShopifyWebhookStep("saving_pending_missing_email", {
        webhookId,
        orderId: toNullableString(payload.id) ?? "missing"
      });
      await savePendingSubscription(supabase, payload, null);
      logShopifyWebhookStep("return_pending_missing_email", {
        webhookId,
        orderId: toNullableString(payload.id) ?? "missing"
      });
      return NextResponse.json({ ok: true, pending: true, reason: "missing_email" });
    }

    const userId = await findOwnerUserIdByEmail(supabase, email);
    logShopifyWebhookStep("owner_lookup_result", {
      webhookId,
      email,
      foundQrCodeOwner: Boolean(userId),
      ownerUserId: userId ?? "missing"
    });

    if (!userId) {
      logShopifyWebhookStep("saving_pending_user_not_found", {
        webhookId,
        email,
        orderId: toNullableString(payload.id) ?? "missing"
      });
      await savePendingSubscription(supabase, payload, email);
      logShopifyWebhookStep("return_pending_user_not_found", {
        webhookId,
        email,
        orderId: toNullableString(payload.id) ?? "missing"
      });
      return NextResponse.json({ ok: true, pending: true, reason: "user_not_found" });
    }

    const existingSubscription = await findBoostSubscriptionByUserId(supabase, userId);
    logShopifyWebhookStep("existing_subscription_lookup", {
      webhookId,
      userId,
      found: Boolean(existingSubscription),
      status: existingSubscription?.status ?? "missing"
    });

    logShopifyWebhookStep("upsert_attempt", {
      webhookId,
      userId,
      email,
      orderId: toNullableString(payload.id) ?? "missing"
    });

    const { data: upsertedSubscription, error } = await supabase.from("boost_subscriptions").upsert(
      {
        user_id: userId,
        status: "active",
        source: "shopify",
        email,
        shopify_customer_id: toNullableString(payload.customer?.id),
        shopify_order_id: toNullableString(payload.id)
      },
      { onConflict: "user_id" }
    ).select("user_id,status,source,email,shopify_order_id");

    if (error) {
      logShopifyWebhookStep("upsert_failed", {
        webhookId,
        userId,
        error: error.message
      });
      throw error;
    }

    logShopifyWebhookStep("upsert_succeeded", {
      webhookId,
      userId,
      rows: upsertedSubscription?.length ?? 0,
      status: upsertedSubscription?.[0]?.status ?? "missing"
    });
  } catch (error) {
    logShopifyWebhookStep("return_processing_error", {
      webhookId,
      message: error instanceof Error ? error.message : String(error)
    });
    logServerError("/api/webhooks/shopify process orders/paid", error);
    return NextResponse.json({ error: "Could not process Shopify webhook." }, { status: 500 });
  }

  logShopifyWebhookStep("return_activated", {
    webhookId
  });
  return NextResponse.json({ ok: true, activated: true });
}

function isValidShopifyHmac(rawBody: string, hmacHeader: string | null) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret || !hmacHeader) return false;

  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const digestBuffer = Buffer.from(digest, "base64");
  const headerBuffer = Buffer.from(hmacHeader, "base64");

  if (digestBuffer.length !== headerBuffer.length) return false;

  return timingSafeEqual(digestBuffer, headerBuffer);
}

function orderIncludesBoost(payload: ShopifyOrderPayload) {
  const boostProductId = process.env.SHOPIFY_BOOST_PRODUCT_ID?.trim();
  const boostVariantId = process.env.SHOPIFY_BOOST_VARIANT_ID?.trim();

  if (!boostProductId && !boostVariantId) {
    throw new Error("Missing SHOPIFY_BOOST_PRODUCT_ID or SHOPIFY_BOOST_VARIANT_ID.");
  }

  return (payload.line_items ?? []).some((item) => {
    const productId = toNullableString(item.product_id);
    const variantId = toNullableString(item.variant_id);

    return (
      (boostProductId ? productId === boostProductId : false) ||
      (boostVariantId ? variantId === boostVariantId : false)
    );
  });
}

function readLineItemIds(payload: ShopifyOrderPayload) {
  return (payload.line_items ?? []).map((item) => ({
    product_id: toNullableString(item.product_id) ?? "missing",
    variant_id: toNullableString(item.variant_id) ?? "missing"
  }));
}

function readShopifyEmail(payload: ShopifyOrderPayload) {
  return normalizeEmail(
    readNoteAttribute(payload.note_attributes, "tapplytap_email") ??
      payload.email ??
      payload.contact_email ??
      payload.customer?.email ??
      ""
  );
}

function readNoteAttribute(noteAttributes: ShopifyOrderPayload["note_attributes"], key: string) {
  if (!noteAttributes) return null;

  if (Array.isArray(noteAttributes)) {
    return noteAttributes.find((item) => item.name === key)?.value ?? null;
  }

  const value = noteAttributes[key];
  return typeof value === "string" ? value : null;
}

function normalizeEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function findOwnerUserIdByEmail(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string
) {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("owner_user_id")
    .eq("owner_email", email)
    .not("owner_user_id", "is", null)
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0]?.owner_user_id ?? null;
}

async function findBoostSubscriptionByUserId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("boost_subscriptions")
    .select("user_id,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function savePendingSubscription(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  payload: ShopifyOrderPayload,
  email: string | null
) {
  const fallbackEmail = email ?? normalizeEmail(payload.email ?? payload.contact_email ?? payload.customer?.email) ?? "unknown@pending.local";
  const { error } = await supabase.from("boost_subscription_pending").insert({
    email: fallbackEmail,
    status: "active",
    shopify_customer_id: toNullableString(payload.customer?.id),
    shopify_order_id: toNullableString(payload.id),
    payload: payload as unknown as Json
  });

  if (error) {
    throw error;
  }
}

function toNullableString(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function logShopifyWebhookStep(step: string, details: Record<string, unknown>) {
  console.info("[shopify_webhook]", {
    step,
    timestamp: new Date().toISOString(),
    ...details
  });
}
