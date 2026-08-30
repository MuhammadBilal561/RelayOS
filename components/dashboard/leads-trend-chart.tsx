"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface DailyPoint {
  date: string;
  leads: number;
  bookings: number;
}

export function LeadsTrendChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#DEE2E8" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 11, fill: "#3A4150" }}
          axisLine={{ stroke: "#DEE2E8" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis tick={{ fontSize: 11, fill: "#3A4150" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #DEE2E8", fontSize: 12 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Line type="monotone" dataKey="leads" name="Leads" stroke="#F2A93B" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#2FBF71" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
