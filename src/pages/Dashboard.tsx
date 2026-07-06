import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, BarChart3, Activity, Clock, ArrowUpRight, LogOut } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDatasets } from '@/hooks/useDatasets';
import { APODCard } from '@/components/nasa/APODCard';
import { NEOPanel } from '@/components/nasa/NEOPanel';

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { datasets, loading: datasetsLoading } = useDatasets();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="orbital-loader" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate stats from real data
  const totalDatasets = datasets.length;
  const processingCount = datasets.filter(d => d.processing_status === 'processing').length;
  const totalSize = datasets.reduce((acc, d) => acc + (d.metadata?.file_size_bytes || 0), 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const recentDatasets = datasets.slice(0, 4);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const recentActivity = datasets.slice(0, 4).map(d => ({
    action: d.processing_status === 'standardized' ? 'Dataset standardized' : 
            d.processing_status === 'processing' ? 'Processing started' : 
            d.processing_status === 'pending' ? 'Dataset uploaded' : 'Processing failed',
    dataset: d.name,
    time: formatDate(d.updated_at),
    type: d.processing_status === 'standardized' ? 'success' : 
          d.processing_status === 'failed' ? 'error' : 'info'
  }));

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
            className="mb-8 flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                <span className="text-foreground">Welcome to </span>
                <span className="gradient-text-cosmic">COSMIC</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                {user.email} • Researcher
              </p>
            </div>
            <Button variant="ghost" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
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
              value={datasetsLoading ? '...' : totalDatasets}
              change={`${datasets.filter(d => {
                const created = new Date(d.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created > weekAgo;
              }).length} this week`}
              changeType="positive"
              icon={Database}
              color="primary"
            />
            <StatsCard
              title="Processing"
              value={datasetsLoading ? '...' : processingCount}
              change={processingCount > 0 ? 'In progress' : 'All complete'}
              changeType={processingCount > 0 ? 'neutral' : 'positive'}
              icon={Activity}
              color="secondary"
            />
            <StatsCard
              title="Data Volume"
              value={datasetsLoading ? '...' : formatSize(totalSize)}
              change="Total stored"
              changeType="neutral"
              icon={BarChart3}
              color="accent"
            />
            <StatsCard
              title="Ready"
              value={datasetsLoading ? '...' : datasets.filter(d => d.processing_status === 'standardized').length}
              change="Standardized"
              changeType="positive"
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
              
              {datasetsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="orbital-loader" />
                </div>
              ) : recentDatasets.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No datasets yet</p>
                  <Link to="/datasets">
                    <Button variant="cosmic">
                      <Upload className="w-4 h-4" />
                      Upload Your First Dataset
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentDatasets.map((dataset, index) => (
                    <motion.div
                      key={dataset.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="glass-card p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            dataset.metadata?.file_format === 'fits' ? 'bg-secondary/20' : 'bg-accent/20'
                          }`}>
                            <Database className={`w-5 h-5 ${
                              dataset.metadata?.file_format === 'fits' ? 'text-secondary' : 'text-accent'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{dataset.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {dataset.metadata?.file_format?.toUpperCase() || 'Unknown'} • {formatDate(dataset.created_at)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dataset.processing_status === 'standardized' ? 'bg-accent/20 text-accent' :
                          dataset.processing_status === 'processing' ? 'bg-primary/20 text-primary' :
                          dataset.processing_status === 'failed' ? 'bg-destructive/20 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {dataset.processing_status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-lg font-display font-semibold mb-4">Recent Activity</h2>
              <div className="glass-card p-4 space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-start gap-3 pb-4 border-b border-border/30 last:border-0 last:pb-0"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'success' ? 'bg-accent' : 
                        activity.type === 'error' ? 'bg-destructive' : 'bg-primary'
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
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
