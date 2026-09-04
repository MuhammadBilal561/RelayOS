"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DailyPoint {
  date: string;
  leads: number;
  bookings: number;
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(17,20,27,0.08)",
  boxShadow: "0 12px 28px -8px rgba(17,20,27,0.18)",
  fontSize: 12,
  fontFamily: "var(--font-inter)",
  background: "#fff",
};

export function LeadsTrendChart({ data }: { data: DailyPoint[] }) {
  const isEmpty = data.length === 0 || data.every((d) => d.leads === 0 && d.bookings === 0);

  if (isEmpty) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-ink-900/12 bg-paper-50/60">
        <p className="max-w-sm text-center text-sm text-ink-400">
          No activity in the last 30 days — metrics appear here as leads and bookings come in.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2A93B" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#F2A93B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2FBF71" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2FBF71" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF1F4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 11, fill: "#8A92A0" }}
            axisLine={{ stroke: "#E3E6EB" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8A92A0" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 600, color: "#171B23", marginBottom: 4 }}
            itemStyle={{ paddingBottom: 2 }}
          />
          <Area
            type="monotone"
            dataKey="leads"
            name="Leads"
            stroke="#F2A93B"
            strokeWidth={2}
            fill="url(#leadsFill)"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="bookings"
            name="Bookings"
            stroke="#2FBF71"
            strokeWidth={2}
            fill="url(#bookingsFill)"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
