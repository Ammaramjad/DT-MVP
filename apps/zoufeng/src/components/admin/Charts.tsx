"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import type { DashboardStats } from "@/lib/admin-stats";
import { statusLabels } from "@/lib/i18n";

const tip = { contentStyle: { borderRadius: 14, border: "none", boxShadow: "0 10px 30px rgba(31,52,112,.18)", background: "rgba(255,255,255,.92)", fontSize: 12 } };
const axis = { fontSize: 11, fill: "#6b7693" };
const nt = (n: number) => `NT$${n >= 1000 ? `${Math.round(n / 1000)}k` : n}`;

function Card({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`neu flex flex-col p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="text-[15px] font-black">{title}</h3>
        {sub && <p className="text-[11.5px] text-muted">{sub}</p>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function DashboardCharts({ data }: { data: DashboardStats }) {
  const statusData = data.byStatus.map((s) => ({ name: statusLabels[s.status]?.en ?? s.status, value: s.n, color: statusLabels[s.status]?.color ?? "#94a3b8" }));
  return (
    <div className="grid gap-5 xl:grid-cols-3 [&>*]:min-w-0">
      <Card title="Rides per day · 每日行程" sub="Last 30 days (excl. cancelled)" className="xl:col-span-2">
        <div className="h-[280px]">
          <ResponsiveContainer>
            <ComposedChart data={data.daily} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="gRides" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6bff" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2f6bff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe5ef" vertical={false} />
              <XAxis dataKey="day" tick={axis} interval={3} />
              <YAxis tick={axis} allowDecimals={false} />
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="rides" name="Rides" stroke="#2f6bff" strokeWidth={2.5} fill="url(#gRides)" />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Booking status · 訂單狀態">
        <div className="h-[280px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="none">
                {statusData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 11.5 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Revenue by month · 月營收" sub="Completed bookings" className="xl:col-span-2">
        <div className="h-[260px]">
          <ResponsiveContainer>
            <BarChart data={data.monthly} margin={{ left: 0, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7b4dff" />
                  <stop offset="100%" stopColor="#1fd1e8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe5ef" vertical={false} />
              <XAxis dataKey="month" tick={axis} />
              <YAxis tick={axis} tickFormatter={nt} />
              <Tooltip {...tip} formatter={(v: number) => `NT$ ${v.toLocaleString()}`} />
              <Bar dataKey="revenue" name="Revenue" fill="url(#gRev)" radius={[10, 10, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Rides by category · 服務分類">
        <div className="h-[260px]">
          <ResponsiveContainer>
            <BarChart data={data.byCategory} layout="vertical" margin={{ left: 8, right: 12 }}>
              <XAxis type="number" tick={axis} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={axis} width={70} />
              <Tooltip {...tip} />
              <Bar dataKey="rides" name="Rides" radius={[0, 10, 10, 0]}>
                {data.byCategory.map((c) => (
                  <Cell key={c.name} fill={c.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Peak hours · 尖峰時段" sub="Pickups by hour (Taipei time)" className="xl:col-span-2">
        <div className="h-[220px]">
          <ResponsiveContainer>
            <AreaChart data={data.hourly} margin={{ left: -18, right: 6, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe5ef" vertical={false} />
              <XAxis dataKey="hour" tick={axis} interval={1} />
              <YAxis tick={axis} allowDecimals={false} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="rides" name="Rides" stroke="#f59e0b" fill="#f59e0b33" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Vehicle usage · 車型使用">
        <div className="h-[220px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.byVehicle} dataKey="rides" nameKey="name" outerRadius={80} stroke="#fff" strokeWidth={2}>
                {data.byVehicle.map((v, i) => (
                  <Cell key={v.name} fill={["#2f6bff", "#1fd1e8", "#7b4dff", "#10b981", "#f59e0b", "#ef4444", "#64748b"][i % 7]} />
                ))}
              </Pie>
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
