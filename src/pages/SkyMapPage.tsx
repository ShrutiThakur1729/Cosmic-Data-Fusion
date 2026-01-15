import { useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Settings, Maximize2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { SkyMap } from '@/components/skymap/SkyMap';
import { Button } from '@/components/ui/button';

export default function SkyMapPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
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
            className="mb-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  <span className="gradient-text-cosmic">Interactive Sky Map</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  Explore celestial objects in 3D with real-time visualization
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4 mb-6 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <strong>Tip:</strong> Click on any celestial object to view details. 
                Drag to rotate the view, scroll to zoom. Switch between Equatorial and Galactic coordinate systems.
              </p>
            </div>
          </motion.div>

          {/* Sky Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="h-[600px] lg:h-[700px]"
          >
            <SkyMap />
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
          >
            {[
              { label: 'Stars', value: '10', color: '#60d5fa' },
              { label: 'Galaxies', value: '3', color: '#a855f7' },
              { label: 'Nebulae', value: '2', color: '#f472b6' },
              { label: 'Clusters', value: '1', color: '#fbbf24' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <div
                  className="text-2xl font-display font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
