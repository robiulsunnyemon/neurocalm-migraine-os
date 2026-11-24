import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") ?? "40.7128";
  const lon = searchParams.get("lon") ?? "-74.0060";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(
      lon
    )}&hourly=surface_pressure&past_days=1&forecast_days=2&timezone=auto`;

    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch barometric pressure" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      hourly?: { time: string[]; surface_pressure: number[] };
    };

    const times = data.hourly?.time ?? [];
    const pressures = data.hourly?.surface_pressure ?? [];
    if (pressures.length < 25) {
      return NextResponse.json({ error: "Insufficient weather data" }, { status: 502 });
    }

    // Index 24 is approximately "now" when past_days=1
    const nowIdx = Math.min(24, pressures.length - 1);
    const currentPressure = pressures[nowIdx];
    const past24hPressure = pressures[0];
    const delta24h = Number((currentPressure - past24hPressure).toFixed(1));

    // Check next 24h for a sharp barometric drop
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
  } catch {
    return NextResponse.json(
      { error: "Weather service unavailable" },
      { status: 500 }
    );
  }
}
