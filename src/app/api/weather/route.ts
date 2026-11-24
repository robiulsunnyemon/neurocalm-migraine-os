import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") ?? "23.8103";
  const lon = searchParams.get("lon") ?? "90.4125";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(
      lon
    )}&hourly=surface_pressure&past_days=1&forecast_days=2&timezone=auto`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "NeuroCalmMigraineOS/1.0",
      },
    });

    if (res.ok) {
      const data = (await res.json()) as {
        hourly?: { time: string[]; surface_pressure: number[] };
      };

      const times = data.hourly?.time ?? [];
      const pressures = data.hourly?.surface_pressure ?? [];
      if (pressures.length >= 25) {
        const nowIdx = Math.min(24, pressures.length - 1);
        const currentPressure = pressures[nowIdx];
        const past24hPressure = pressures[0];
        const delta24h = Number((currentPressure - past24hPressure).toFixed(1));

        const futureSlice = pressures.slice(nowIdx, nowIdx + 24);
        const minFuture = Math.min(...futureSlice);
        const maxDropNext24h = Number((minFuture - currentPressure).toFixed(1));

        return NextResponse.json({
          currentPressureHpa: Number(currentPressure.toFixed(1)),
          delta24hHpa: delta24h,
          maxDropNext24hHpa: maxDropNext24h,
          stormAlert: maxDropNext24h <= -5,
          updatedAt: times[nowIdx] ?? new Date().toISOString(),
        });
      }
    }

    // Fallback to MET Norway if Open-Meteo rate-limits shared cloud IPs
    const metRes = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${encodeURIComponent(
        Number(lat).toFixed(2)
      )}&lon=${encodeURIComponent(Number(lon).toFixed(2))}`,
      {
        cache: "no-store",
        headers: {
          "User-Agent": "NeuroCalmMigraineOS/1.0 github.com/neurocalm-migraine-os",
        },
      }
    );

    if (metRes.ok) {
      const metData = (await metRes.json()) as {
        properties?: {
          timeseries?: Array<{
            time: string;
            data?: {
              instant?: { details?: { air_pressure_at_sea_level?: number } };
            };
          }>;
        };
      };
      const series = metData.properties?.timeseries ?? [];
      const current = series[0]?.data?.instant?.details?.air_pressure_at_sea_level;
      if (typeof current === "number") {
        const next24 = series
          .slice(0, 24)
          .map((s) => s.data?.instant?.details?.air_pressure_at_sea_level)
          .filter((v): v is number => typeof v === "number");
        const minFuture = next24.length > 0 ? Math.min(...next24) : current;
        const maxDropNext24h = Number((minFuture - current).toFixed(1));

        return NextResponse.json({
          currentPressureHpa: Number(current.toFixed(1)),
          delta24hHpa: 0,
          maxDropNext24hHpa: maxDropNext24h,
          stormAlert: maxDropNext24h <= -5,
          updatedAt: series[0]?.time ?? new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ unavailable: true });
  } catch {
    return NextResponse.json({ unavailable: true });
  }
}
