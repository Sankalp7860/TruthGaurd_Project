/**
 * Cloudinary Upload Utility
 * Handles image uploads to Cloudinary
 */

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dhvo3gnuz';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

export interface CloudinaryUploadResponse {
  url: string;
  publicId: string;
  secureUrl: string;
}

/**
 * Upload image to Cloudinary
 * @param imageUri - Local URI of the image to upload
 * @returns Promise with Cloudinary URL
 */
export const uploadToCloudinary = async (imageUri: string): Promise<CloudinaryUploadResponse> => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Extract filename and create file object
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore - React Native FormData handles this differently
    formData.append('file', {
      uri: imageUri,
      type,
      name: filename,
    });
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const data = await response.json();

    return {
      url: data.url,
      secureUrl: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID of the image
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    // Note: Deletion requires authentication, typically done from backend
    // For now, we'll just log it. Implement backend endpoint if needed.
    console.log('Delete image with publicId:', publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};
