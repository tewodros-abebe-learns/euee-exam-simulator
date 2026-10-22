import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Folder, FolderPlus, Loader2, Lock, Pencil, Trash2, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Folder as FolderModel, RenameResult } from '../lib/subjectStore';

interface FolderManagerProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderModel[];
  /** How many exams each folder currently shows. */
  counts: Record<string, number>;
  onAdd: (name: string) => string | null;
  onRename: (name: string, next: string) => RenameResult;
  onRemove: (name: string) => void;
}

/**
 * Folder management.
 *
 * Deliberately preference-only: renaming or deleting a folder here changes what
 * the student sees, never the exams themselves (a deleted folder's papers fall
 * back into General). That is why this dialog can be used freely without any
 * risk to the library or the database.
 */
export default function FolderManager({
  isOpen,
  onClose,
  folders,
  counts,
  onAdd,
  onRename,
  onRemove,
}: FolderManagerProps) {
  const { t } = useLanguage();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [rowError, setRowError] = useState('');
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A fresh dialog must never reopen holding a half-finished edit.
  useEffect(() => {
    if (!isOpen) return;
    setNewName('');
    setAddError('');
    setEditingKey(null);
    setDraftName('');
    setRowError('');
    setConfirmingKey(null);
    setBusyKey(null);
    const focus = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(focus);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Escape backs out of the innermost state first.
      if (editingKey) {
        setEditingKey(null);
        setRowError('');
        return;
      }
      if (confirmingKey) {
        setConfirmingKey(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, editingKey, confirmingKey, onClose]);

  if (!isOpen) return null;

  const submitNewFolder = () => {
    const name = newName.trim();
    if (name.length < 2) {
      setAddError(t('subjectNameTooShort'));
      return;
    }
    const existing = folders.find((folder) => folder.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setAddError(t('folderExists'));
      return;
    }
    const created = onAdd(name);
    if (!created) {
      setAddError(t('folderExists'));
      return;
    }
    setNewName('');
    setAddError('');
  };

  const startRename = (folder: FolderModel) => {
    setEditingKey(folder.key);
    setDraftName(folder.name);
    setRowError('');
    setConfirmingKey(null);
  };

  const commitRename = (folder: FolderModel) => {
    const name = draftName.trim();
    if (name === folder.name) {
      setEditingKey(null);
      return;
    }
    setBusyKey(folder.key);
    const result = onRename(folder.name, name);
    setBusyKey(null);
    if (result.ok) {
      setEditingKey(null);
      setRowError('');
      return;
    }
    setRowError(
      result.error === 'duplicate'
        ? t('folderExists')
        : result.error === 'locked'
          ? t('folderLocked')
          : t('subjectNameTooShort')
    );
    return;
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t('manageFolders')} className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl my-auto"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-4 border-b border-[var(--border-color)]">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('manageFolders')}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{t('foldersDesc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-2 -mr-1 -mt-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create */}
        <div className="p-5 pb-4 border-b border-[var(--border-color)]">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              maxLength={40}
              onChange={(event) => {
                setNewName(event.target.value);
                setAddError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitNewFolder();
              }}
              placeholder={t('newFolderPlaceholder')}
              aria-label={t('newFolderPlaceholder')}
              className="flex-1 min-w-0 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors"
            />
            <button
              type="button"
              onClick={submitNewFolder}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#8AB4F8] text-gray-900 text-sm font-bold hover:bg-[#AECBFA] transition-colors shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              {t('createFolder')}
            </button>
          </div>
          {addError && <p className="mt-2 text-[11px] font-semibold text-amber-500">{addError}</p>}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {folders.map((folder) => {
            const isEditing = editingKey === folder.key;
            const isConfirming = confirmingKey === folder.key;
            const count = counts[folder.name] ?? 0;

            return (
              <div
                key={folder.key}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-accent)] px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 shrink-0 text-[var(--text-secondary)]" />

                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      maxLength={40}
                      value={draftName}
                      onChange={(event) => {
                        setDraftName(event.target.value);
                        setRowError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename(folder);
                      }}
                      aria-label={t('renameLabel')}
                      className="flex-1 min-w-0 bg-[var(--bg-secondary)] border border-[#8AB4F8] rounded-lg px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 min-w-0 text-sm font-semibold text-[var(--text-primary)] truncate">
                      {folder.name}
                    </span>
                  )}

                  {!isEditing && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {t('folderExamCount', { count })}
                    </span>
                  )}

                  {folder.locked ? (
                    <span title={t('folderLocked')} className="shrink-0 p-1.5 text-[var(--text-secondary)] opacity-60">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  ) : isEditing ? (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => commitRename(folder)}
                        disabled={busyKey === folder.key}
                        aria-label={t('save')}
                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      >
                        {busyKey === folder.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKey(null);
                          setRowError('');
                        }}
                        aria-label={t('cancel')}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startRename(folder)}
                        aria-label={`${t('renameLabel')} ${folder.name}`}
                        title={t('renameLabel')}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingKey(folder.key);
                          setEditingKey(null);
                        }}
                        aria-label={`${t('delete')} ${folder.name}`}
                        title={t('delete')}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing && rowError && (
                  <p className="mt-1.5 pl-6.5 text-[11px] font-semibold text-amber-500">{rowError}</p>
                )}

                {isConfirming && (
                  <div className="mt-2 pl-6.5">
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {t('deleteFolderDesc', { count })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingKey(null)}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 text-[var(--text-primary)] text-xs font-bold hover:bg-white/10 transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRemove(folder.name);
                          setConfirmingKey(null);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-red-400 text-white text-xs font-bold hover:bg-red-500 transition-colors"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--card-hover)] transition-colors"
          >
            {t('done')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
