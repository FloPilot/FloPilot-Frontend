/** Split a filename into editable base + locked extension (includes the dot). */
export function splitFileName(name: string): { base: string; ext: string } {
  const raw = (name || "").trim();
  const slash = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"));
  const leaf = slash >= 0 ? raw.slice(slash + 1) : raw;
  const dot = leaf.lastIndexOf(".");
  if (dot <= 0) return { base: leaf, ext: "" };
  return { base: leaf.slice(0, dot), ext: leaf.slice(dot) };
}

/** Characters that break downloads / storage paths. */
const UNSAFE_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFileBaseName(base: string): string {
  return base
    .replace(UNSAFE_NAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function joinFileName(
  base: string,
  ext: string,
  options?: { prefix?: string | null }
): string {
  const cleanBase = sanitizeFileBaseName(base) || "untitled";
  const cleanExt = ext && ext.startsWith(".") ? ext : ext ? `.${ext}` : "";
  const prefix = (options?.prefix || "").trim();
  if (prefix) return `${prefix} - ${cleanBase}${cleanExt}`;
  return `${cleanBase}${cleanExt}`;
}

export function renameFile(file: File, fullName: string): File {
  const next = (fullName || "").trim() || file.name;
  if (next === file.name) return file;
  return new File([file], next, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

export type NamedUploadFile = {
  file: File;
  /** Full saved name including extension (and optional prefix). */
  name: string;
  /** Editable base without extension / prefix — useful for proof labels. */
  baseName: string;
};

export function buildNamedUploadFiles(
  files: File[],
  bases: string[],
  options?: { prefix?: string | null }
): NamedUploadFile[] {
  return files.map((file, index) => {
    const { ext } = splitFileName(file.name);
    const baseName = sanitizeFileBaseName(bases[index] ?? "") || "untitled";
    const name = joinFileName(baseName, ext, options);
    return {
      file: renameFile(file, name),
      name,
      baseName,
    };
  });
}
