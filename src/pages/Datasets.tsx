import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Grid, List, Database, FileText } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { FileUpload } from '@/components/upload/FileUpload';
import { DatasetCard } from '@/components/dashboard/DatasetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const sampleDatasets = [
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
  {
    name: 'Hubble Deep Field',
    type: 'fits' as const,
    size: '1.2 GB',
    rowCount: undefined,
    lastModified: '3 days ago',
    status: 'ready' as const,
    source: 'HST Archive',
  },
  {
    name: 'JWST NIRCam Observations',
    type: 'fits' as const,
    size: '3.8 GB',
    rowCount: undefined,
    lastModified: '1 week ago',
    status: 'ready' as const,
    source: 'MAST Archive',
  },
];

export default function Datasets() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const filteredDatasets = sampleDatasets.filter((dataset) =>
    dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dataset.source?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileParsed = (file: any) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

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
                Browse Datasets
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

              {/* Dataset Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}
              >
                {filteredDatasets.map((dataset, index) => (
                  <motion.div
                    key={dataset.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <DatasetCard {...dataset} />
                  </motion.div>
                ))}
              </motion.div>

              {filteredDatasets.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No datasets found matching your search.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <FileUpload onFileParsed={handleFileParsed} />
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
