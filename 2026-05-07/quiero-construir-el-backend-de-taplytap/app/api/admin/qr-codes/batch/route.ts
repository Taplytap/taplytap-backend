import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createQrCodesBatch } from "@/lib/qr";

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const quantity = contentType.includes("application/json")
      ? Number((await request.json()).quantity)
      : Number((await request.formData()).get("quantity"));

    await createQrCodesBatch(quantity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create QR codes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
