import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  Activity,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from 'recharts';

// Sample data for charts
const lightCurveData = Array.from({ length: 100 }, (_, i) => ({
  time: i * 0.1,
  flux: 1 + 0.1 * Math.sin(i * 0.3) + Math.random() * 0.02,
  error: 0.02,
}));

const spectrumData = Array.from({ length: 200 }, (_, i) => ({
  wavelength: 4000 + i * 20,
  intensity: Math.exp(-((i - 100) ** 2) / 1000) * 0.5 + 
             Math.exp(-((i - 50) ** 2) / 200) * 0.3 +
             Math.exp(-((i - 150) ** 2) / 300) * 0.4 +
             Math.random() * 0.05,
}));

const scatterData = Array.from({ length: 50 }, () => ({
  x: Math.random() * 10 - 5,
  y: Math.random() * 10 - 5,
  magnitude: Math.random() * 5 + 10,
  color: Math.random() * 2,
}));

export default function Analysis() {
  const [activeChart, setActiveChart] = useState('lightcurve');

  return (
    <div className="min-h-screen relative">
      <StarField />
      <Navbar />

      <main className="relative pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  <span className="gradient-text-cosmic">Data Analysis</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  Visualize and analyze your astronomical datasets
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Analysis Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Data Points', value: '1.2M', icon: Activity, color: 'primary' },
              { label: 'Time Span', value: '4.2 years', icon: TrendingUp, color: 'secondary' },
              { label: 'Anomalies', value: '23', icon: Sparkles, color: 'accent' },
              { label: 'Correlations', value: '7', icon: BarChart3, color: 'primary' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-xl font-display font-bold gradient-text-cosmic">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Charts */}
          <Tabs defaultValue="lightcurve" className="space-y-6">
            <TabsList className="glass-card p-1">
              <TabsTrigger value="lightcurve" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Activity className="w-4 h-4 mr-2" />
                Light Curve
              </TabsTrigger>
              <TabsTrigger value="spectrum" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="w-4 h-4 mr-2" />
                Spectrum
              </TabsTrigger>
              <TabsTrigger value="scatter" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <TrendingUp className="w-4 h-4 mr-2" />
                Color-Magnitude
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lightcurve">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-lg">Light Curve Analysis</h3>
                    <p className="text-sm text-muted-foreground">Flux variations over time (BJD)</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lightCurveData}>
                      <defs>
                        <linearGradient id="fluxGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60d5fa" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#60d5fa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#64748b" 
                        tick={{ fill: '#94a3b8' }}
                        label={{ value: 'Time (BJD)', position: 'bottom', fill: '#94a3b8' }}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        tick={{ fill: '#94a3b8' }}
                        label={{ value: 'Relative Flux', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(230 25% 10%)', 
                          border: '1px solid hsl(230 25% 18%)',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="flux" 
                        stroke="#60d5fa" 
                        fill="url(#fluxGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="spectrum">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-lg">Spectral Analysis</h3>
                    <p className="text-sm text-muted-foreground">Intensity vs Wavelength (Å)</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={spectrumData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis 
                        dataKey="wavelength" 
                        stroke="#64748b" 
                        tick={{ fill: '#94a3b8' }}
                        label={{ value: 'Wavelength (Å)', position: 'bottom', fill: '#94a3b8' }}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        tick={{ fill: '#94a3b8' }}
                        label={{ value: 'Intensity', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(230 25% 10%)', 
                          border: '1px solid hsl(230 25% 18%)',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="intensity" 
                        stroke="#a855f7" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="scatter">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-lg">Color-Magnitude Diagram</h3>
                    <p className="text-sm text-muted-foreground">B-V Color Index vs Absolute Magnitude</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis 
                        dataKey="x" 
                        name="B-V" 
                        stroke="#64748b" 
                        tick={{ fill: '#94a3b8' }}
                        label={{ value: 'B-V Color Index', position: 'bottom', fill: '#94a3b8' }}
                      />
                      <YAxis 
                        dataKey="y" 
                        name="Mag" 
                        stroke="#64748b" 
                        tick={{ fill: '#94a3b8' }}
                        reversed
                        label={{ value: 'Absolute Magnitude', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(230 25% 10%)', 
                          border: '1px solid hsl(230 25% 18%)',
                          borderRadius: '8px'
                        }}
                      />
                      <Scatter 
                        name="Stars" 
                        data={scatterData} 
                        fill="#60d5fa"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">AI-Assisted Insights</h3>
                <p className="text-sm text-muted-foreground">Automatically detected patterns and anomalies</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { 
                  title: 'Transit Event Detected', 
                  desc: 'Periodic dip in flux at T=2.4 BJD suggests planetary transit',
                  confidence: '94%' 
                },
                { 
                  title: 'Spectral Line Match', 
                  desc: 'Hydrogen-alpha emission detected at 6563Å',
                  confidence: '87%' 
                },
                { 
                  title: 'Cluster Membership', 
                  desc: '3 stars show consistent proper motion vectors',
                  confidence: '78%' 
                },
              ].map((insight, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{insight.title}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                      {insight.confidence}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
