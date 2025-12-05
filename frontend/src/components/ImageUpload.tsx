import { useState, useRef } from 'react';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onImagesChange, maxImages = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadedPaths: string[] = [];

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const formData = new FormData();
        formData.append('image', file);

        // Use fetch directly for multipart/form-data as apiClient expects JSON
        const token = localStorage.getItem('notehub_access_token');
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const fetchResponse = await fetch(`${apiUrl}/api/upload/image`, {
          method: 'POST',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });

        if (!fetchResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const response = await fetchResponse.json() as { path: string };

        if (response.path) {
          uploadedPaths.push(response.path);
        }
      }

      if (uploadedPaths.length > 0) {
        onImagesChange([...images, ...uploadedPaths]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (imagePath: string) => {
    try {
      // Extract filename from path
      const filename = imagePath.split('/').pop();
      if (filename) {
        const token = localStorage.getItem('notehub_access_token');
        const apiUrl = import.meta.env.VITE_API_URL || '';
        await fetch(`${apiUrl}/api/upload/${filename}`, {
          method: 'DELETE',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      }
      onImagesChange(images.filter(img => img !== imagePath));
    } catch (err) {
      console.error('Failed to delete image:', err);
      // Still remove from list even if API call fails
      onImagesChange(images.filter(img => img !== imagePath));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Images {images.length > 0 && `(${images.length}/${maxImages})`}
        </label>
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <i className="glass-i fas fa-spinner fa-spin mr-1"></i>
                Uploading...
              </>
            ) : (
              <>
                <i className="glass-i fas fa-image mr-1"></i>
                Add Images
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          <i className="glass-i fas fa-exclamation-triangle mr-1"></i>
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((imagePath, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-tertiary)]"
            >
              <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${imagePath}`}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(imagePath)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-700"
                title="Remove image"
              >
                <i className="glass-i fas fa-times text-xs"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        Accepted formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB per image.
      </p>
    </div>
  );
}
