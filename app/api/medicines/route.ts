import { NextRequest, NextResponse } from "next/server";

type RxNormConcept = {
  rxcui?: string;
  name?: string;
  synonym?: string;
  tty?: string;
};

type FdaLabel = {
  id?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    substance_name?: string[];
  };
  active_ingredient?: string[];
  purpose?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
};

function firstText(value?: string[]) {
  return value?.[0]?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Enter at least two letters to search." },
      { status: 400 },
    );
  }

  if (query.length > 80) {
    return NextResponse.json(
      { error: "Search term is too long." },
      { status: 400 },
    );
  }

  const safeQuery = query.replace(/[^\p{L}\p{N}\s.-]/gu, " ").trim();
  const quotedQuery = `"${safeQuery}"`;

  const rxNormUrl = new URL("https://rxnav.nlm.nih.gov/REST/drugs.json");
  rxNormUrl.searchParams.set("name", query);

  const fdaUrl = new URL("https://api.fda.gov/drug/label.json");
  fdaUrl.searchParams.set(
    "search",
    `openfda.brand_name:${quotedQuery}+openfda.generic_name:${quotedQuery}`,
  );
  fdaUrl.searchParams.set("limit", "6");

  const [rxNormResult, fdaResult] = await Promise.allSettled([
    fetch(rxNormUrl, { next: { revalidate: 3600 } }),
    fetch(fdaUrl, { next: { revalidate: 3600 } }),
  ]);

  let medicines: RxNormConcept[] = [];
  let labels: ReturnType<typeof mapLabels> = [];
  let rxNormAvailable = false;
  let fdaAvailable = false;

  if (rxNormResult.status === "fulfilled" && rxNormResult.value.ok) {
    rxNormAvailable = true;
    const data = await rxNormResult.value.json();
    const groups = data?.drugGroup?.conceptGroup ?? [];
    medicines = groups.flatMap(
      (group: { conceptProperties?: RxNormConcept[] }) =>
        group.conceptProperties ?? [],
    );

    const seen = new Set<string>();
    medicines = medicines.filter((medicine) => {
      const key = medicine.rxcui ?? medicine.name ?? "";
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (fdaResult.status === "fulfilled" && fdaResult.value.ok) {
    fdaAvailable = true;
    const data = await fdaResult.value.json();
    labels = mapLabels(data?.results ?? []);
  }

  if (!rxNormAvailable && !fdaAvailable) {
    return NextResponse.json(
      { error: "The medicine databases could not be reached. Try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    query,
    medicines,
    labels,
    sources: { rxNormAvailable, fdaAvailable },
  });
}

function mapLabels(records: FdaLabel[]) {
  return records.map((record, index) => ({
    id: record.id ?? `label-${index}`,
    brand: record.openfda?.brand_name?.[0] ?? "",
    generic: record.openfda?.generic_name?.[0] ?? "",
    manufacturer: record.openfda?.manufacturer_name?.[0] ?? "",
    ingredient:
      record.openfda?.substance_name?.[0] ??
      firstText(record.active_ingredient),
    purpose: firstText(record.purpose),
    uses: firstText(record.indications_and_usage),
    warnings: firstText(record.warnings),
  }));
}