import { NextResponse } from "next/server";

type Provider = {
  name: string;
  url: string;
  transform: (data: Response) => {
    code: string;
    country: string;
    region: string;
    city: string;
    ip: string;
  };
};

const provider: Provider = {
  name: "geojs",
  url: "https://get.geojs.io/v1/ip/geo.json",
  transform: (data: any) => ({
    code: data.country_code,
    country: data.country,
    region: data.region,
    city: data.city,
    ip: data.ip,
  }),
};

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  const errors: string[] = [];

  try {
    const res = await fetchWithTimeout(provider.url, 8000);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const location = provider.transform(json);

    if (!location.ip) {
      throw new Error("No IP address in response");
    }

    return NextResponse.json(
      {
        ...location,
        source: provider.name,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "Request timeout"
        : err?.message || "Unknown error";
    errors.push(`${provider.name}: ${msg}`);
  }

  return NextResponse.json(
    {
      error: "Geolocation provider failed",
      details: errors,
    },
    { status: 502 }
  );
}
