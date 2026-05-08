import { writeFileSync } from "fs";
import { createQrCodesBatch } from "@/lib/qr";
import { getSiteUrl } from "@/lib/env";

async function main() {
  const quantity = Number(process.argv[2] ?? 10);
  const outputPath = process.argv[3];
  const qrCodes = await createQrCodesBatch(quantity);
  const rows = qrCodes.map((qr) => ({
    code: qr.code,
    status: qr.status,
    url: `${getSiteUrl()}/user/${qr.code}`
  }));

  if (outputPath) {
    writeFileSync(outputPath, JSON.stringify(rows, null, 2));
    console.log(`Created ${rows.length} QR codes in ${outputPath}`);
    return;
  }

  console.table(rows);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
