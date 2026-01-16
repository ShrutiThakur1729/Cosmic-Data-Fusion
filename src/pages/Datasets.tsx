import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Grid, List, Database, FileText, Trash2, Globe, Lock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { FileUpload } from '@/components/upload/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDatasets, Dataset } from '@/hooks/useDatasets';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

function DatasetCardDB({ 
  dataset, 
  onDelete 
}: { 
  dataset: Dataset; 
  onDelete: (id: string) => void;
}) {
  const formatSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'standardized': return 'bg-accent/20 text-accent';
      case 'processing': return 'bg-primary/20 text-primary';
      case 'pending': return 'bg-muted text-muted-foreground';
      case 'failed': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="glass-card p-4 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            dataset.metadata?.file_format === 'fits' ? 'bg-secondary/20' : 'bg-accent/20'
          }`}>
            {dataset.metadata?.file_format === 'fits' ? (
              <Database className="w-6 h-6 text-secondary" />
            ) : (
              <FileText className="w-6 h-6 text-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate">{dataset.name}</h3>
              {dataset.is_public ? (
                <Globe className="w-3 h-3 text-accent" />
              ) : (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            {dataset.description && (
              <p className="text-xs text-muted-foreground truncate mb-2">{dataset.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatSize(dataset.metadata?.file_size_bytes)}</span>
              {dataset.metadata?.num_rows && (
                <span>{dataset.metadata.num_rows.toLocaleString()} rows</span>
              )}
              <span>{formatDate(dataset.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dataset.processing_status)}`}>
            {dataset.processing_status}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(dataset.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Datasets() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const { datasets, loading, deleteDataset, refreshDatasets } = useDatasets();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const filteredDatasets = datasets.filter((dataset) =>
    dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dataset.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this dataset?')) {
      await deleteDataset(id);
    }
  };

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
              <span className="gradient-text-cosmic">Dataset Repository</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Upload, manage, and explore your astronomical datasets
            </p>
          </motion.div>

          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList className="glass-card p-1">
              <TabsTrigger value="browse" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Database className="w-4 h-4 mr-2" />
                My Datasets ({datasets.length})
              </TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Upload New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-6">
              {/* Search and Filters */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col md:flex-row gap-4"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search datasets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted/30 border-border/50"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="orbital-loader" />
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredDatasets.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No datasets yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Upload your first astronomical dataset to get started
                  </p>
                  <Button variant="cosmic" onClick={() => {
                    const tabTrigger = document.querySelector('[data-state="inactive"][value="upload"]') as HTMLElement;
                    tabTrigger?.click();
                  }}>
                    <Plus className="w-4 h-4" />
                    Upload Dataset
                  </Button>
                </motion.div>
              )}

              {/* Dataset Grid/List */}
              {!loading && filteredDatasets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}
                >
                  {filteredDatasets.map((dataset, index) => (
                    <motion.div
                      key={dataset.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                    >
                      <DatasetCardDB dataset={dataset} onDelete={handleDelete} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <FileUpload onDatasetUploaded={refreshDatasets} />
              </motion.div>

              {/* Processing Pipeline Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6"
              >
                <h3 className="font-display font-semibold text-lg mb-4">
                  Automatic Processing Pipeline
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { step: 1, title: 'Format Detection', desc: 'Auto-detect FITS, CSV, HDF5' },
                    { step: 2, title: 'Parsing', desc: 'Extract headers & data' },
                    { step: 3, title: 'Standardization', desc: 'Unit & coordinate conversion' },
                    { step: 4, title: 'Storage', desc: 'Cloud repository sync' },
                  ].map((item, index) => (
                    <div key={item.step} className="relative">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {item.step}
                        </div>
                        <span className="font-medium text-foreground">{item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-11">{item.desc}</p>
                      {index < 3 && (
                        <div className="hidden md:block absolute top-4 left-[calc(100%-8px)] w-4 h-0.5 bg-border" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
