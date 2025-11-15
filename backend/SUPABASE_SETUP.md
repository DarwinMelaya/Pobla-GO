# Supabase Storage Setup Guide

This guide explains how to configure Supabase Storage for menu images in the PoblaGO backend.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Setup Steps

### 1. Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name the bucket: `menu-images`
5. Set it as **Public bucket** (so images can be accessed via public URLs)
6. Click **Create bucket**

### 2. Configure Bucket Policies (Optional but Recommended)

For better security, you can set up RLS (Row Level Security) policies:

1. Go to **Storage** > **Policies** for the `menu-images` bucket
2. Create policies for:
   - **INSERT**: Allow authenticated users or service role
   - **SELECT**: Allow public read access (since it's a public bucket)
   - **DELETE**: Allow authenticated users or service role

### 3. Get Your Supabase Credentials

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (for server-side operations) - **Keep this secret!**

### 4. Add Environment Variables

Add the following to your `.env` file in the backend directory:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**:

- Use the **Service Role Key** (not the anon key) for server-side operations
- Never commit your `.env` file to version control
- The Service Role Key has admin privileges, keep it secure

### 5. Folder Structure

Images will be stored in the following folder structure:

- `menu-maintenance/` - Images for menu maintenance items
- `menu/` - Images for menu items (if needed in the future)

## How It Works

1. **Image Upload**: When a base64 image is sent to the API, it's automatically uploaded to Supabase Storage
2. **URL Storage**: The Supabase public URL is stored in MongoDB instead of the base64 string
3. **Image Deletion**: When a menu item is deleted or updated with a new image, the old image is automatically deleted from Supabase

## Testing

After setup, test the integration by:

1. Creating a new menu maintenance item with an image
2. Checking that the `image` field contains a Supabase URL (not base64)
3. Verifying the image is accessible via the URL

## Troubleshooting

### Images not uploading

- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- Verify the bucket name is exactly `menu-images`
- Check that the bucket is set to public

### Images not accessible

- Ensure the bucket is set to **Public**
- Check the URL format in the database
- Verify the Supabase project is active

### Permission errors

- Ensure you're using the Service Role Key (not anon key)
- Check bucket policies if RLS is enabled
