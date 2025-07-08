/*
  # Avatar Storage Setup and Helper Functions

  1. Storage Functions
    - Helper functions for avatar management
    - Safe avatar URL updates
    - Avatar deletion

  2. Notes
    - Storage bucket creation must be done through Supabase dashboard
    - Storage policies must be created manually
*/

-- Create a function to help with avatar management
CREATE OR REPLACE FUNCTION get_avatar_url(user_uuid uuid)
RETURNS text AS $$
DECLARE
  avatar_url text;
BEGIN
  SELECT p.avatar_url INTO avatar_url
  FROM profiles p
  WHERE p.id = user_uuid;
  
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

-- Create a function to delete avatar URL
CREATE OR REPLACE FUNCTION delete_avatar_url()
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET avatar_url = null,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_avatar_url() TO authenticated;

-- Create a function to check if avatars bucket exists
CREATE OR REPLACE FUNCTION check_avatars_bucket()
RETURNS boolean AS $$
DECLARE
  bucket_exists boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) INTO bucket_exists;
  
  RETURN bucket_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_avatars_bucket() TO authenticated;

/*
  MANUAL SETUP REQUIRED:
  
  1. Create the 'avatars' storage bucket in the Supabase dashboard:
     - Go to Storage in your Supabase dashboard
     - Click "New bucket"
     - Name: avatars
     - Public: true
     - File size limit: 2MB (2097152 bytes)
     - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
  
  2. Create these storage policies in the Supabase dashboard:
  
     Policy 1: "Allow authenticated users to upload avatars"
     - Operation: INSERT
     - Target roles: authenticated
     - Policy definition: bucket_id = 'avatars'
  
     Policy 2: "Allow public access to avatars" 
     - Operation: SELECT
     - Target roles: public
     - Policy definition: bucket_id = 'avatars'
  
     Policy 3: "Allow users to update own avatars"
     - Operation: UPDATE
     - Target roles: authenticated  
     - Policy definition: bucket_id = 'avatars'
  
     Policy 4: "Allow users to delete own avatars"
     - Operation: DELETE
     - Target roles: authenticated
     - Policy definition: bucket_id = 'avatars'
*/