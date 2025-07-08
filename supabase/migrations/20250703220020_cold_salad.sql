/*
  # Fix Avatar Storage Policies

  1. Storage Setup
    - Create avatars bucket if it doesn't exist
    - Set up proper storage policies for avatar uploads

  2. Security
    - Allow authenticated users to upload their own avatars
    - Allow public read access to avatars
    - Allow users to update/delete their own avatars
*/

-- Create avatars bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars', 
    'avatars', 
    true, 
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  );
EXCEPTION WHEN unique_violation THEN
  -- Bucket already exists, update it
  UPDATE storage.buckets 
  SET 
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  WHERE id = 'avatars';
END $$;

-- Note: Storage policies need to be created through the Supabase dashboard or using the management API
-- The following policies should be created manually in the Supabase dashboard under Storage > avatars bucket:

/*
Policy Name: "Allow authenticated users to upload avatars"
Operation: INSERT
Target roles: authenticated
Policy definition: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

Policy Name: "Allow public access to avatars" 
Operation: SELECT
Target roles: public
Policy definition: bucket_id = 'avatars'

Policy Name: "Allow users to update own avatars"
Operation: UPDATE
Target roles: authenticated  
Policy definition: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

Policy Name: "Allow users to delete own avatars"
Operation: DELETE
Target roles: authenticated
Policy definition: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
*/

-- Create a function to help with avatar management
CREATE OR REPLACE FUNCTION get_avatar_url(user_uuid uuid)
RETURNS text AS $$
DECLARE
  avatar_url text;
BEGIN
  SELECT avatar_url INTO avatar_url
  FROM profiles 
  WHERE id = user_uuid;
  
  RETURN avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_avatar_url(uuid) TO authenticated;

-- Create a function to update avatar URL safely
CREATE OR REPLACE FUNCTION update_avatar_url(new_avatar_url text)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET avatar_url = new_avatar_url,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_avatar_url(text) TO authenticated;