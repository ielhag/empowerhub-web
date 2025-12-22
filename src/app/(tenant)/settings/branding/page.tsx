'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useTenantSettings, useUpdateBranding } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { ChevronLeft, Upload, Loader2, Check, Palette } from 'lucide-react';

const colorPresets = [
  { name: 'Violet', primary: '#7c3aed', secondary: '#8b5cf6' },
  { name: 'Blue', primary: '#2563eb', secondary: '#3b82f6' },
  { name: 'Green', primary: '#059669', secondary: '#10b981' },
  { name: 'Rose', primary: '#e11d48', secondary: '#f43f5e' },
  { name: 'Orange', primary: '#ea580c', secondary: '#f97316' },
  { name: 'Teal', primary: '#0d9488', secondary: '#14b8a6' },
];

export default function BrandingSettingsPage() {
  const { data: tenantData, isLoading } = useTenantSettings();
  const updateBrandingMutation = useUpdateBranding();

  const [primaryColor, setPrimaryColor] = useState(
    tenantData?.tenant.branding?.primary_color || '#7c3aed'
  );
  const [secondaryColor, setSecondaryColor] = useState(
    tenantData?.tenant.branding?.secondary_color || '#8b5cf6'
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetClick = (preset: (typeof colorPresets)[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBrandingMutation.mutateAsync({
        logo: logoFile || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update branding:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branding</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize your organization's appearance
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Organization Logo
          </h2>
          <div className="flex items-start gap-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center cursor-pointer hover:border-violet-500 dark:hover:border-violet-400 transition-colors overflow-hidden"
            >
              {logoPreview || tenantData?.tenant.branding?.logo_url ? (
                <img
                  src={logoPreview || tenantData?.tenant.branding?.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upload logo</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Upload your organization logo. Recommended size: 512x512px
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Supported formats: PNG, JPG, SVG. Max size: 2MB
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              >
                Choose File
              </button>
            </div>
          </div>
        </div>

        {/* Colors Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Brand Colors</h2>
          </div>

          {/* Presets */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Quick presets</p>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    primaryColor === preset.primary
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors uppercase"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                style={{ backgroundColor: primaryColor }}
                className="px-4 py-2 text-white rounded-lg font-medium"
              >
                Primary Button
              </button>
              <button
                type="button"
                style={{ backgroundColor: secondaryColor }}
                className="px-4 py-2 text-white rounded-lg font-medium"
              >
                Secondary Button
              </button>
              <span
                style={{ color: primaryColor }}
                className="font-medium"
              >
                Link Text
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              Branding saved
            </span>
          )}
          <button
            type="submit"
            disabled={updateBrandingMutation.isPending}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {updateBrandingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Save Branding'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
