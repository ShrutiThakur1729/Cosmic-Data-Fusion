import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity } from 'lucide-react';

export interface AnalysisSnapshot { t: string; dataset: string; objects: number; completeness: number; quality: number }

export function AnalysisCharts({ history }: { history: AnalysisSnapshot[] }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-secondary" />
        <h3 className="text-sm font-display font-semibold">Live Analysis Over Time</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{history.length} runs</span>
      </div>
      {history.length === 0 ? (
        <div className="text-xs text-muted-foreground">Charts fill in as datasets finish standardizing.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={history}>
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="objects" name="Objects" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={history}>
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="completeness" name="Completeness %" stroke="hsl(var(--accent))" strokeWidth={2} dot />
                <Line type="monotone" dataKey="quality" name="Quality" stroke="hsl(var(--secondary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
