import { useState, useEffect, useRef } from 'react';
import { createApp, updateApp } from '../api/apps.js';

export default function AppFormModal({ isOpen, onClose, onSave, app }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);

  // Populate form when app changes (edit mode) or reset (create mode)
  useEffect(() => {
    if (isOpen) {
      setName(app?.name || '');
      setNotes(app?.notes || '');
      setLogoFile(null);
      setLogoPreview(app?.logo || '');
      setFormError(null);
    }
  }, [isOpen, app]);

  // Scroll locking
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  if (!isOpen) return null;

  const isEdit = !!app;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('App name is required');
      return;
    }

    if (!isEdit && !logoFile) {
      setFormError('Logo is required');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('notes', notes.trim());
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateApp(app._id, formData);
      } else {
        await createApp(formData);
      }
      onSave();
      onClose();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-100">
            {isEdit ? 'Edit App' : 'Add App'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              App Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goodreads"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Logo {!isEdit && '*'}
            </label>
            {logoPreview && (
              <div className="w-16 h-16 rounded-xl overflow-hidden mb-2">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 file:bg-zinc-700 file:text-zinc-300 file:border-0 file:px-4 file:py-2 file:mr-4 file:rounded-lg file:cursor-pointer"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {formError && (
            <p className="text-sm text-rose-400 mt-2 mb-4">{formError}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving\u2026' : 'Save App'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
