"use client";

import { useCallback, useRef, useState } from "react";
import { NameFilesBeforeUploadDialog } from "@/components/files/name-files-before-upload-dialog";
import type { NamedUploadFile } from "@/lib/file-naming";

export type NameBeforeUploadOptions = {
  title?: string;
  description?: string;
  namePrefix?: string | null;
  confirmLabel?: string;
};

type PendingPrompt = {
  files: File[];
  options: NameBeforeUploadOptions;
  resolve: (value: NamedUploadFile[] | null) => void;
};

/**
 * Intercept file selection with an on-brand rename modal before upload.
 *
 * @example
 * const { promptRename, nameFilesDialog } = useNameBeforeUpload();
 * const named = await promptRename(Array.from(files));
 * if (!named) return;
 * for (const { file, name } of named) { await upload(..., name); }
 * // render: <>{nameFilesDialog}</>
 */
export function useNameBeforeUpload(defaults?: NameBeforeUploadOptions) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const pendingRef = useRef<PendingPrompt | null>(null);
  pendingRef.current = pending;
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const close = useCallback((result: NamedUploadFile[] | null) => {
    const current = pendingRef.current;
    if (!current) return;
    current.resolve(result);
    setPending(null);
  }, []);

  const promptRename = useCallback(
    (files: File[], options?: NameBeforeUploadOptions) => {
      const list = files.filter(Boolean);
      if (list.length === 0) return Promise.resolve([] as NamedUploadFile[]);

      return new Promise<NamedUploadFile[] | null>((resolve) => {
        setPending({
          files: list,
          options: { ...defaultsRef.current, ...options },
          resolve,
        });
      });
    },
    []
  );

  const nameFilesDialog = (
    <NameFilesBeforeUploadDialog
      open={Boolean(pending)}
      files={pending?.files ?? []}
      title={pending?.options.title}
      description={pending?.options.description}
      namePrefix={pending?.options.namePrefix}
      confirmLabel={pending?.options.confirmLabel}
      onConfirm={(named) => close(named)}
      onCancel={() => close(null)}
    />
  );

  return {
    promptRename,
    nameFilesDialog,
    isNamingOpen: Boolean(pending),
  };
}
