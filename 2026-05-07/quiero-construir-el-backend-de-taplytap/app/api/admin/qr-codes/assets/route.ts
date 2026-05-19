import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "La generación de PNG QR está desactivada. Exporta el CSV de links y genera los QR con una herramienta externa validada."
    },
    { status: 410 }
  );
}
