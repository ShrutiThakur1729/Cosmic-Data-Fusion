import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Dataset {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  processing_status: 'pending' | 'processing' | 'standardized' | 'failed';
  is_public: boolean;
  created_at: string;
  updated_at: string;
  metadata?: DatasetMetadata;
}

export interface DatasetMetadata {
  id: string;
  dataset_id: string;
  file_name: string;
  file_format: string;
  file_size_bytes: number | null;
  coordinate_system: 'equatorial' | 'galactic' | 'ecliptic' | 'icrs' | null;
  units: string | null;
  temporal_range_start: string | null;
  temporal_range_end: string | null;
  object_name: string | null;
  num_rows: number | null;
  num_columns: number | null;
  header_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface UploadDatasetParams {
  name: string;
  description?: string;
  file: File;
  metadata: {
    file_name: string;
    file_format: string;
    file_size_bytes: number;
    coordinate_system?: 'equatorial' | 'galactic' | 'ecliptic' | 'icrs';
    units?: string;
    object_name?: string;
    num_rows?: number;
    num_columns?: number;
    header_data?: Record<string, any>;
  };
}

export function useDatasets() {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDatasets = useCallback(async () => {
    if (!user) {
      setDatasets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch datasets with metadata
      const { data: datasetsData, error: datasetsError } = await supabase
        .from('datasets')
        .select(`
          *,
          metadata:dataset_metadata(*)
        `)
        .order('created_at', { ascending: false });

      if (datasetsError) throw datasetsError;

      // Transform the data to flatten metadata
      const transformedData = (datasetsData || []).map(dataset => ({
        ...dataset,
        metadata: dataset.metadata?.[0] || null
      }));

      setDatasets(transformedData as Dataset[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError(err as Error);
      toast.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const uploadDataset = async (params: UploadDatasetParams): Promise<Dataset | null> => {
    if (!user) {
      toast.error('Please sign in to upload datasets');
      return null;
    }

    try {
      // 1. Create dataset record
      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          owner_id: user.id,
          name: params.name,
          description: params.description || null,
          processing_status: 'pending',
          is_public: false,
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      // 2. Upload file to storage
      const filePath = `${user.id}/${datasetData.id}/${params.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('datasets')
        .upload(filePath, params.file);

      if (uploadError) {
        // Rollback dataset creation
        await supabase.from('datasets').delete().eq('id', datasetData.id);
        throw uploadError;
      }

      // 3. Create metadata record
      const { error: metadataError } = await supabase
        .from('dataset_metadata')
        .insert({
          dataset_id: datasetData.id,
          file_name: params.metadata.file_name,
          file_format: params.metadata.file_format,
          file_size_bytes: params.metadata.file_size_bytes,
          coordinate_system: params.metadata.coordinate_system || null,
          units: params.metadata.units || null,
          object_name: params.metadata.object_name || null,
          num_rows: params.metadata.num_rows || null,
          num_columns: params.metadata.num_columns || null,
          header_data: params.metadata.header_data || null,
        });

      if (metadataError) {
        console.error('Metadata error:', metadataError);
        // Continue anyway - dataset is created
      }

      // 4. Create initial version record
      const { error: versionError } = await supabase
        .from('dataset_versions')
        .insert({
          dataset_id: datasetData.id,
          version_number: 1,
          file_path: filePath,
          change_description: 'Initial upload',
          created_by: user.id,
        });

      if (versionError) {
        console.error('Version error:', versionError);
      }

      // 5. Update processing status
      await supabase
        .from('datasets')
        .update({ processing_status: 'processing' })
        .eq('id', datasetData.id);

      toast.success('Dataset uploaded successfully!');
      
      // Simulate processing completion
      setTimeout(async () => {
        await supabase
          .from('datasets')
          .update({ processing_status: 'standardized' })
          .eq('id', datasetData.id);
        fetchDatasets();
      }, 3000);

      // Refresh datasets
      await fetchDatasets();
      
      return datasetData as Dataset;
    } catch (err) {
      console.error('Error uploading dataset:', err);
      toast.error('Failed to upload dataset');
      return null;
    }
  };

  const deleteDataset = async (datasetId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to delete datasets');
      return false;
    }

    try {
      // Get the dataset to find file path
      const { data: versions } = await supabase
        .from('dataset_versions')
        .select('file_path')
        .eq('dataset_id', datasetId);

      // Delete files from storage
      if (versions && versions.length > 0) {
        const filePaths = versions.map(v => v.file_path);
        await supabase.storage.from('datasets').remove(filePaths);
      }

      // Delete dataset (cascades to metadata, versions, collaborators)
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId);

      if (error) throw error;

      toast.success('Dataset deleted successfully');
      await fetchDatasets();
      return true;
    } catch (err) {
      console.error('Error deleting dataset:', err);
      toast.error('Failed to delete dataset');
      return false;
    }
  };

  const updateDataset = async (datasetId: string, updates: Partial<Dataset>): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to update datasets');
      return false;
    }

    try {
      const { error } = await supabase
        .from('datasets')
        .update({
          name: updates.name,
          description: updates.description,
          is_public: updates.is_public,
        })
        .eq('id', datasetId);

      if (error) throw error;

      toast.success('Dataset updated successfully');
      await fetchDatasets();
      return true;
    } catch (err) {
      console.error('Error updating dataset:', err);
      toast.error('Failed to update dataset');
      return false;
    }
  };

  return {
    datasets,
    loading,
    error,
    uploadDataset,
    deleteDataset,
    updateDataset,
    refreshDatasets: fetchDatasets,
  };
}
