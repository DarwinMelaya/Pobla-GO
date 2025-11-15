const supabase = require("../config/supabase");
const crypto = require("crypto");

// Bucket name for menu images
const MENU_IMAGES_BUCKET = "menu-images";

/**
 * Upload image to Supabase Storage
 * @param {String} base64Image - Base64 encoded image string (with or without data URL prefix)
 * @param {String} folder - Folder path in bucket (e.g., 'menu-maintenance' or 'menu')
 * @param {String} fileName - Optional custom file name, otherwise generates UUID
 * @returns {Promise<{url: string, path: string}>} - Public URL and storage path
 */
async function uploadImageToSupabase(base64Image, folder = "menu-maintenance", fileName = null) {
  try {
    if (!base64Image) {
      throw new Error("No image data provided");
    }

    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let base64Data = base64Image;
    let mimeType = "image/png"; // default
    let fileExtension = "png";

    if (base64Image.includes(",")) {
      const parts = base64Image.split(",");
      const dataUrlPrefix = parts[0];
      base64Data = parts[1];

      // Extract MIME type from prefix
      const mimeMatch = dataUrlPrefix.match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
        // Extract file extension from MIME type
        const extensionMap = {
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        };
        fileExtension = extensionMap[mimeType] || "png";
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Generate file name if not provided
    const finalFileName = fileName || `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `${folder}/${finalFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error("Error uploading image to Supabase:", error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {String} filePath - Path to file in storage (e.g., 'menu-maintenance/uuid.png')
 * @returns {Promise<boolean>} - Success status
 */
async function deleteImageFromSupabase(filePath) {
  try {
    if (!filePath) {
      return true; // Nothing to delete
    }

    // Extract path from URL if full URL is provided
    let storagePath = filePath;
    if (filePath.includes(MENU_IMAGES_BUCKET)) {
      const urlParts = filePath.split(`${MENU_IMAGES_BUCKET}/`);
      if (urlParts.length > 1) {
        storagePath = urlParts[1];
      }
    }

    const { error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error("Error deleting image from Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting image from Supabase:", error);
    return false;
  }
}

/**
 * Check if a string is a base64 image
 * @param {String} str - String to check
 * @returns {Boolean}
 */
function isBase64Image(str) {
  if (!str || typeof str !== "string") return false;
  
  // Check if it's a data URL
  if (str.startsWith("data:image/")) return true;
  
  // Check if it's base64 encoded (basic check)
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(str) && str.length > 100; // Base64 images are typically long
}

/**
 * Check if a string is a URL
 * @param {String} str - String to check
 * @returns {Boolean}
 */
function isUrl(str) {
  if (!str || typeof str !== "string") return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  uploadImageToSupabase,
  deleteImageFromSupabase,
  isBase64Image,
  isUrl,
  MENU_IMAGES_BUCKET,
};

