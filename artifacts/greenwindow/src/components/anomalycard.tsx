import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AnomalyData {
  history: { day: number; kwh: number }[];
  today_kwh: number;
  mean: number;
  std_dev: number;
  is_anomaly: boolean;
  message: string;
}

export function AnomalyCard() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/anomaly-check')
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return null; // fail silently, never show a broken card on stage
  if (!data) return null; // loading — render nothing rather than a spinner flash

  return (
    <div className="gw-card p-6" data-testid="card-anomaly">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              07 / PUMP DIAGNOSTICS
            </span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
              14-Day Baseline
            </span>
          </div>
          <h3 className="mt-1 text-lg font-bold text-neutral-900">Motor Health & Energy Anomaly Check</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Statistical deviation threshold tracking for early motor strain or valve leakage detection.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-neutral-600">
          <Activity className="h-5 w-5 text-emerald-600" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px] items-center">
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <ReferenceLine y={data.mean} stroke="#94a3b8" strokeDasharray="3 3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  borderColor: '#262626',
                  borderRadius: '0.5rem',
                  color: '#ffffff',
                  fontSize: '11px',
                }}
              />
              <Line
                type="monotone"
                dataKey="kwh"
                stroke={data.is_anomaly ? '#dc2626' : '#059669'}
                strokeWidth={2.5}
                dot={(props: any) =>
                  props.payload.day === data.history.length ? (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={data.is_anomaly ? '#dc2626' : '#059669'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ) : (
                    <circle cx={props.cx} cy={props.cy} r={2} fill="#cbd5e1" />
                  )
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Today's Consumption</span>
            <span className="font-bold text-neutral-900 gw-mono">{data.today_kwh} kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">14-Day Baseline Mean</span>
            <span className="font-bold text-neutral-700 gw-mono">{data.mean.toFixed(2)} kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Standard Deviation (σ)</span>
            <span className="font-bold text-neutral-700 gw-mono">±{data.std_dev.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium ${
          data.is_anomaly
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
        }`}
      >
        {data.is_anomaly ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        )}
        <span>{data.message}</span>
      </div>
    </div>
  );
}