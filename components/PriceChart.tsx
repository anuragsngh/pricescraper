"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = {
  date: string;
  price?: number;
  forecast?: number;
};

const PriceChart = ({ data }: { data: Point[] }) => {
  return (
    <div className="w-full h-72 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />

          {/* Past prices */}
          <Line
            type="monotone"
            dataKey="price"
            strokeWidth={2}
            dot={false}
          />

          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
