'use client';

import { useState, useRef, useCallback } from 'react';
import { App } from 'antd';
import { Camera } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/useAuthStore';
import { uploadAvatar } from '@/lib/auth-api';
import { useTranslations } from 'next-intl';

/** Generate a consistent color from a string */
function stringToColor(str: string): string {
  const colors = [
    '#FF6B47', '#3B82F6', '#10B981', '#8B5CF6',
    '#EC4899', '#F59E0B', '#06B6D4', '#6366F1',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitial(name: string | null | undefined, email: string): string {
  if (name && name.trim()) return name.trim()[0].toUpperCase();
  return email[0].toUpperCase();
}

interface AvatarUploadProps {
  size?: 'md' | 'lg';
}

export default function AvatarUpload({ size = 'lg' }: AvatarUploadProps) {
  const { user, updateUser } = useAuthStore();
  const { message } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const t = useTranslations('account');

  const handleImgError = useCallback(() => setImgError(true), []);

  if (!user) return null;

  const px = size === 'lg' ? 'w-20 h-20' : 'w-10 h-10';
  const textSize = size === 'lg' ? 'text-2xl' : 'text-sm';
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-3 h-3';
  const badgeSize = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (!file.type.startsWith('image/')) {
      message.error(t('selectImageFile'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error(t('selectImageFile'));
      return;
    }

    setUploading(true);
    try {
      const result = await uploadAvatar(file);
      updateUser({ avatar: result.avatar });
      setImgError(false);
      message.success(t('avatarUpdated'));
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('avatarUploadFailed'));
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const bgColor = stringToColor(user.email);
  const initial = getInitial(user.username, user.email);

  return (
    <div className="relative group inline-block">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-label={t('uploadAvatar')}
      />

      {/* Avatar display */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`
          ${px} rounded-full overflow-hidden relative
          cursor-pointer transition-opacity duration-200
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        `}
        aria-label={t('changeAvatar')}
      >
        {user.avatar && !imgError ? (
           
          <img
            src={user.avatar}
            alt={t('avatarAlt')}
            className="w-full h-full object-cover"
            onError={handleImgError}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${textSize} font-bold text-white`}
            style={{ backgroundColor: bgColor }}
          >
            {initial}
          </div>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
            <Camera className={`${iconSize} text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
          </div>
        )}

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Spinner />
          </div>
        )}
      </button>

      {/* Camera badge */}
      {!uploading && (
        <div
          className={`
            absolute -bottom-0.5 -right-0.5 rtl:right-auto rtl:-left-0.5 ${badgeSize} rounded-full
            bg-surface border-2 border-white shadow-sm
            flex items-center justify-center
            pointer-events-none
          `}
        >
          <Camera className="w-3 h-3 text-muted" />
        </div>
      )}
    </div>
  );
}

export { stringToColor, getInitial };
