import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, Zap, Globe, Shield, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { HeroOrb } from '@/components/cosmic/HeroOrb';

const features = [
  {
    icon: Database,
    title: 'Unified Data Repository',
    description: 'Ingest FITS, CSV, and more into a standardized cloud repository with automatic format detection.',
    color: 'primary',
  },
  {
    icon: Zap,
    title: 'Auto-Standardization',
    description: 'Automatic coordinate transformation, unit conversion, and metadata harmonization.',
    color: 'secondary',
  },
  {
    icon: Globe,
    title: 'Interactive Sky Maps',
    description: 'Visualize celestial data on interactive 3D sky maps with real-time exploration.',
    color: 'accent',
  },
  {
    icon: Shield,
    title: 'Secure & Scalable',
    description: 'Enterprise-grade security with role-based access and cloud-native scalability.',
    color: 'primary',
  },
  {
    icon: Sparkles,
    title: 'AI-Assisted Discovery',
    description: 'Optional AI-powered anomaly detection and pattern recognition for research insights.',
    color: 'secondary',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
              >
                <span className="data-point" />
                <span className="text-sm text-primary">Cloud-Native Astronomical Data Platform</span>
              </motion.div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
                <span className="text-foreground">Transform</span>
                <br />
                <span className="gradient-text-cosmic">Astronomical</span>
                <br />
                <span className="text-foreground">Data into</span>
                <br />
                <span className="gradient-text">Discovery</span>
              </h1>

              <p className="text-lg text-muted-foreground mt-6 max-w-lg">
                COSMIC Data Fusion unifies fragmented astronomical datasets into standardized, 
                visual, and discoverable insights—powered by cloud scalability and intelligent automation.
              </p>

              <div className="flex flex-wrap gap-4 mt-8">
                <Link to="/dashboard">
                  <Button variant="cosmic" size="xl" className="group">
                    Start Exploring
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/datasets">
                  <Button variant="glass" size="xl">
                    Upload Data
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex gap-8 mt-12 pt-8 border-t border-border/30"
              >
                {[
                  { value: '10K+', label: 'Datasets Processed' },
                  { value: '50+', label: 'Research Teams' },
                  { value: '99.9%', label: 'Uptime' },
                ].map((stat) => (
                  <motion.div key={stat.label} variants={itemVariants}>
                    <div className="text-2xl font-display font-bold gradient-text-cosmic">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column - 3D Orb */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative h-[400px] md:h-[500px] lg:h-[600px]"
            >
              <HeroOrb />
              
              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-1/4 -left-4 glass-card px-4 py-2 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm text-foreground">FITS Parser Active</span>
                </div>
              </motion.div>
              
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                className="absolute bottom-1/4 -right-4 glass-card px-4 py-2 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-foreground">Cloud Sync</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-muted-foreground">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-5 h-5 text-primary" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-display font-bold">
              <span className="gradient-text-cosmic">Powerful Features</span>
              <br />
              <span className="text-foreground">for Modern Research</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Everything you need to transform raw astronomical data into actionable insights.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="glass-card-hover p-6 group"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-${feature.color}/10 group-hover:bg-${feature.color}/20 transition-colors`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}`} />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8 md:p-12 text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 opacity-50" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold gradient-text-cosmic">
                Ready to Transform Your Research?
              </h2>
              <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
                Join researchers worldwide who are accelerating their discoveries with COSMIC Data Fusion.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Link to="/signup">
                  <Button variant="cosmic" size="xl">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/datasets">
                  <Button variant="glass" size="xl">
                    Try Demo
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 border-t border-border/30">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
              <Database className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold gradient-text-cosmic">COSMIC</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 COSMIC Data Fusion. Transforming astronomical data into discovery.
          </p>
        </div>
      </footer>
    </div>
  );
}
