import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, BarChart3, Activity, Clock, ArrowUpRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DatasetCard } from '@/components/dashboard/DatasetCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const recentDatasets = [
  {
    name: 'Gaia DR3 Subset',
    type: 'csv' as const,
    size: '2.4 GB',
    rowCount: 1500000,
    lastModified: '2 hours ago',
    status: 'ready' as const,
    source: 'ESA Gaia Archive',
  },
  {
    name: 'SDSS Spectroscopy',
    type: 'fits' as const,
    size: '850 MB',
    rowCount: undefined,
    lastModified: '5 hours ago',
    status: 'processing' as const,
    source: 'SDSS DR17',
  },
  {
    name: 'TESS Light Curves',
    type: 'fits' as const,
    size: '320 MB',
    rowCount: undefined,
    lastModified: '1 day ago',
    status: 'ready' as const,
    source: 'MAST Archive',
  },
  {
    name: 'Kepler Exoplanet Data',
    type: 'csv' as const,
    size: '156 MB',
    rowCount: 245000,
    lastModified: '2 days ago',
    status: 'ready' as const,
    source: 'NASA Exoplanet Archive',
  },
];

const recentActivity = [
  { action: 'Dataset standardized', dataset: 'Gaia DR3 Subset', time: '2 hours ago', type: 'success' },
  { action: 'Processing started', dataset: 'SDSS Spectroscopy', time: '5 hours ago', type: 'info' },
  { action: 'Coordinate transform', dataset: 'TESS Light Curves', time: '1 day ago', type: 'success' },
  { action: 'Unit conversion', dataset: 'Kepler Exoplanet Data', time: '2 days ago', type: 'success' },
];

export default function Dashboard() {
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
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              <span className="text-foreground">Welcome to </span>
              <span className="gradient-text-cosmic">COSMIC</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Your astronomical data processing dashboard
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <StatsCard
              title="Total Datasets"
              value={24}
              change="+3 this week"
              changeType="positive"
              icon={Database}
              color="primary"
            />
            <StatsCard
              title="Processing"
              value={2}
              change="1 completing soon"
              changeType="neutral"
              icon={Activity}
              color="secondary"
            />
            <StatsCard
              title="Data Volume"
              value="12.8 GB"
              change="+2.4 GB this month"
              changeType="positive"
              icon={BarChart3}
              color="accent"
            />
            <StatsCard
              title="API Calls"
              value="1,247"
              change="Today"
              changeType="neutral"
              icon={ArrowUpRight}
              color="primary"
            />
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 mb-8"
          >
            <h2 className="text-lg font-display font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/datasets">
                <Button variant="cosmic">
                  <Upload className="w-4 h-4" />
                  Upload Dataset
                </Button>
              </Link>
              <Link to="/skymap">
                <Button variant="glass">
                  <BarChart3 className="w-4 h-4" />
                  View Sky Map
                </Button>
              </Link>
              <Link to="/analysis">
                <Button variant="outline">
                  <Activity className="w-4 h-4" />
                  Run Analysis
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Datasets */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold">Recent Datasets</h2>
                <Link to="/datasets">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="grid gap-4">
                {recentDatasets.map((dataset, index) => (
                  <motion.div
                    key={dataset.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <DatasetCard {...dataset} />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-lg font-display font-semibold mb-4">Recent Activity</h2>
              <div className="glass-card p-4 space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-3 pb-4 border-b border-border/30 last:border-0 last:pb-0"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'success' ? 'bg-accent' : 'bg-primary'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.dataset}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
