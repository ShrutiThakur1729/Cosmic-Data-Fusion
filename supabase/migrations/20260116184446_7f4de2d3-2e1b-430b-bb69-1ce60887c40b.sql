-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('researcher', 'institutional', 'admin');

-- Create enum for processing status
CREATE TYPE public.processing_status AS ENUM ('pending', 'processing', 'standardized', 'failed');

-- Create enum for coordinate systems
CREATE TYPE public.coordinate_system AS ENUM ('equatorial', 'galactic', 'ecliptic', 'icrs');

-- Create user_roles table (following security best practices - roles in separate table)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'researcher',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    institution TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create datasets table
CREATE TABLE public.datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    processing_status processing_status NOT NULL DEFAULT 'pending',
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dataset_metadata table
CREATE TABLE public.dataset_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_format TEXT NOT NULL,
    file_size_bytes BIGINT,
    coordinate_system coordinate_system,
    units TEXT,
    temporal_range_start TIMESTAMP WITH TIME ZONE,
    temporal_range_end TIMESTAMP WITH TIME ZONE,
    object_name TEXT,
    num_rows INTEGER,
    num_columns INTEGER,
    header_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dataset_versions table for version control
CREATE TABLE public.dataset_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    file_path TEXT NOT NULL,
    change_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (dataset_id, version_number)
);

-- Create dataset_collaborators table for sharing
CREATE TABLE public.dataset_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'write', 'admin')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (dataset_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_collaborators ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Helper function: Check if current user is dataset owner
CREATE OR REPLACE FUNCTION public.is_dataset_owner(_dataset_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.datasets
    WHERE id = _dataset_id
      AND owner_id = auth.uid()
  )
$$;

-- Helper function: Check if current user is a collaborator on the dataset
CREATE OR REPLACE FUNCTION public.is_dataset_collaborator(_dataset_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dataset_collaborators
    WHERE dataset_id = _dataset_id
      AND user_id = auth.uid()
  )
$$;

-- Helper function: Check if current user can access dataset
CREATE OR REPLACE FUNCTION public.can_access_dataset(_dataset_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_dataset_owner(_dataset_id) 
    OR public.is_dataset_collaborator(_dataset_id)
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.datasets 
      WHERE id = _dataset_id AND is_public = true
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can manage roles" 
ON public.user_roles FOR ALL 
USING (public.is_admin());

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for datasets
CREATE POLICY "Users can view accessible datasets" 
ON public.datasets FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR public.is_dataset_collaborator(id)
  OR public.is_admin()
  OR is_public = true
);

CREATE POLICY "Users can create their own datasets" 
ON public.datasets FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update datasets" 
ON public.datasets FOR UPDATE 
USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owners and admins can delete datasets" 
ON public.datasets FOR DELETE 
USING (owner_id = auth.uid() OR public.is_admin());

-- RLS Policies for dataset_metadata
CREATE POLICY "Users can view accessible dataset metadata" 
ON public.dataset_metadata FOR SELECT 
USING (public.can_access_dataset(dataset_id));

CREATE POLICY "Owners can insert dataset metadata" 
ON public.dataset_metadata FOR INSERT 
WITH CHECK (public.is_dataset_owner(dataset_id) OR public.is_admin());

CREATE POLICY "Owners can update dataset metadata" 
ON public.dataset_metadata FOR UPDATE 
USING (public.is_dataset_owner(dataset_id) OR public.is_admin());

CREATE POLICY "Owners can delete dataset metadata" 
ON public.dataset_metadata FOR DELETE 
USING (public.is_dataset_owner(dataset_id) OR public.is_admin());

-- RLS Policies for dataset_versions
CREATE POLICY "Users can view accessible dataset versions" 
ON public.dataset_versions FOR SELECT 
USING (public.can_access_dataset(dataset_id));

CREATE POLICY "Owners and write collaborators can insert versions" 
ON public.dataset_versions FOR INSERT 
WITH CHECK (
  public.is_dataset_owner(dataset_id) 
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.dataset_collaborators 
    WHERE dataset_id = dataset_versions.dataset_id 
    AND user_id = auth.uid() 
    AND permission_level IN ('write', 'admin')
  )
);

CREATE POLICY "Owners can update versions" 
ON public.dataset_versions FOR UPDATE 
USING (public.is_dataset_owner(dataset_id) OR public.is_admin());

CREATE POLICY "Owners can delete versions" 
ON public.dataset_versions FOR DELETE 
USING (public.is_dataset_owner(dataset_id) OR public.is_admin());

-- RLS Policies for dataset_collaborators
CREATE POLICY "Users can view collaborators of accessible datasets" 
ON public.dataset_collaborators FOR SELECT 
USING (public.can_access_dataset(dataset_id));

CREATE POLICY "Owners can manage collaborators" 
ON public.dataset_collaborators FOR INSERT 
WITH CHECK (
  public.is_dataset_owner(dataset_id) 
  AND user_id != auth.uid()
);

CREATE POLICY "Owners can update collaborators" 
ON public.dataset_collaborators FOR UPDATE 
USING (public.is_dataset_owner(dataset_id) OR public.is_admin());

CREATE POLICY "Owners can remove collaborators" 
ON public.dataset_collaborators FOR DELETE 
USING (
  public.is_dataset_owner(dataset_id) 
  OR public.is_admin()
  OR user_id = auth.uid()
);

-- Create storage bucket for dataset files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'datasets', 
  'datasets', 
  false, 
  104857600, -- 100MB limit
  ARRAY['application/fits', 'text/csv', 'application/x-hdf5', 'application/json', 'application/octet-stream']
);

-- Storage RLS policies
CREATE POLICY "Users can upload dataset files" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own dataset files" 
ON storage.objects FOR SELECT 
TO authenticated
USING (
  bucket_id = 'datasets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own dataset files" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'datasets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own dataset files" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'datasets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
BEFORE UPDATE ON public.datasets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dataset_metadata_updated_at
BEFORE UPDATE ON public.dataset_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile and assign default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'researcher');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_datasets_owner_id ON public.datasets(owner_id);
CREATE INDEX idx_datasets_processing_status ON public.datasets(processing_status);
CREATE INDEX idx_dataset_metadata_dataset_id ON public.dataset_metadata(dataset_id);
CREATE INDEX idx_dataset_versions_dataset_id ON public.dataset_versions(dataset_id);
CREATE INDEX idx_dataset_collaborators_dataset_id ON public.dataset_collaborators(dataset_id);
CREATE INDEX idx_dataset_collaborators_user_id ON public.dataset_collaborators(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);