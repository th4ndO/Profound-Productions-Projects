"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  createProject,
  createProjects,
  updateProject,
  deleteProject,
  uploadProjectImage,
} from "@/app/admin/actions";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  type Project,
  type ProjectCategory,
} from "@/lib/types";

type FormState = {
  id: string | null;
  title: string;
  description: string;
  category: ProjectCategory;
  client_name: string;
  image_url: string;
  website_url: string;
  display_order: number;
  is_published: boolean;
};

// Vercel caps a serverless function's (and Server Action's) request body at
// 4.5MB regardless of Next.js config, so full-resolution camera photos must
// be downscaled client-side before they ever hit uploadProjectImage.
const MAX_UPLOAD_DIMENSION = 1920;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const JPEG_QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4];
const UPLOAD_CONCURRENCY = 4;

async function compressImageForUpload(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let smallest: Blob | null = null;
    for (const quality of JPEG_QUALITY_STEPS) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
      if (!blob) continue;
      smallest = blob;
      if (blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    return smallest ?? file;
  } catch {
    // Formats the browser can't decode (e.g. some HEIC files) fall back to
    // the original — the upload may still fail server-side if it's too big.
    return file;
  }
}

async function uploadFilesWithConcurrency(
  files: File[],
  concurrency: number,
  onProgress: (done: number, total: number) => void,
  upload: (file: File) => Promise<{ error: string | null; url: string | null }>
) {
  const results: { file: File; url?: string; error?: string }[] = new Array(files.length);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < files.length) {
      const i = cursor++;
      const res = await upload(files[i]);
      results[i] = { file: files[i], url: res.url ?? undefined, error: res.error ?? undefined };
      done++;
      onProgress(done, files.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, files.length) }, worker)
  );
  return results;
}

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  description: "",
  category: "graphic_design",
  client_name: "",
  image_url: "",
  website_url: "",
  display_order: 0,
  is_published: true,
};

export default function ProjectManager({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function startEdit(project: Project) {
    setForm({
      id: project.id,
      title: project.title,
      description: project.description ?? "",
      category: project.category,
      client_name: project.client_name ?? "",
      image_url: project.image_url,
      website_url: project.website_url ?? "",
      display_order: project.display_order,
      is_published: project.is_published,
    });
    setFormError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function uploadFile(file: File) {
    const compressed = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append("file", compressed, file.name);
    return uploadProjectImage(formData);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (files.length === 1) {
      setIsUploading(true);
      setFormError(null);
      const result = await uploadFile(files[0]);
      setIsUploading(false);

      if (result.error || !result.url) {
        setFormError(result.error ?? "Upload failed.");
        return;
      }

      setForm((f) => ({ ...f, image_url: result.url! }));
      return;
    }

    // Multiple files: upload concurrently, then create every project in a
    // single batched insert, using the current category/client/order/
    // published fields as a shared template.
    setIsUploading(true);
    setFormError(null);
    setUploadProgress(`Uploading 0 of ${files.length}…`);

    const results = await uploadFilesWithConcurrency(
      files,
      UPLOAD_CONCURRENCY,
      (done, total) => setUploadProgress(`Uploading ${done} of ${total}…`),
      uploadFile
    );

    const succeeded = results.filter(
      (r): r is { file: File; url: string; error?: string } => Boolean(r.url)
    );
    const failed = results.filter((r) => !r.url);

    if (succeeded.length > 0) {
      setUploadProgress("Saving…");

      const payloads = succeeded.map((r, idx) => ({
        title: form.title
          ? `${form.title} ${idx + 1}`
          : r.file.name.replace(/\.[^/.]+$/, ""),
        description: form.description,
        category: form.category,
        client_name: form.client_name,
        image_url: r.url,
        website_url: form.website_url,
        display_order: form.display_order,
        is_published: form.is_published,
      }));

      const result = await createProjects(payloads);
      if (result.error) {
        setFormError(result.error);
      } else {
        setProjects((prev) => [
          ...payloads
            .map((p) => ({
              ...p,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }))
            .reverse(),
          ...prev,
        ]);
      }
    }

    if (failed.length > 0) {
      setFormError(
        `${failed.length} of ${files.length} image(s) failed to upload: ${failed
          .map((f) => `${f.file.name}${f.error ? ` (${f.error})` : ""}`)
          .join(", ")}`
      );
    }

    setIsUploading(false);
    setUploadProgress(null);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.image_url) {
      setFormError("Upload an image first.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      client_name: form.client_name,
      image_url: form.image_url,
      website_url: form.website_url,
      display_order: form.display_order,
      is_published: form.is_published,
    };

    const result = form.id
      ? await updateProject(form.id, payload)
      : await createProject(payload);

    setIsSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    // Optimistically reflect the change locally; the page also revalidates server-side.
    if (form.id) {
      setProjects((prev) =>
        prev.map((p) => (p.id === form.id ? { ...p, ...payload } : p))
      );
    } else {
      setProjects((prev) => [
        { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ...prev,
      ]);
    }

    resetForm();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This can't be undone.")) return;
    const result = await deleteProject(id);
    if (result.error) {
      alert(result.error);
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="grid gap-10 md:grid-cols-[360px_1fr]">
      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-sm border border-surface-line bg-surface p-6"
      >
        <h2 className="font-mono text-xs uppercase tracking-wide text-neutral">
          {form.id ? "Edit project" : "New project"}
        </h2>

        <div>
          <label className="mb-1.5 block font-mono text-xs text-neutral">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="admin-input"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-xs text-neutral">
            Description (optional)
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="admin-input resize-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-xs text-neutral">Category</label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value as ProjectCategory }))
            }
            className="admin-input"
          >
            {CATEGORY_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-xs text-neutral">
            Client name (optional)
          </label>
          <input
            value={form.client_name}
            onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
            className="admin-input"
          />
        </div>

        {form.category === "website_work" && (
          <div>
            <label className="mb-1.5 block font-mono text-xs text-neutral">
              Website link (optional)
            </label>
            <input
              type="url"
              value={form.website_url}
              onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
              placeholder="https://example.com"
              className="admin-input"
            />
            <p className="mt-1 font-mono text-[10px] text-neutral">
              Adds a &quot;Visit Website&quot; button to this project&apos;s lightbox.
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block font-mono text-xs text-neutral">Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-sm border border-accent/60 px-6 py-3 font-mono text-xs uppercase tracking-wider text-paper transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {form.image_url ? "Change Image" : "Choose Image(s)"}
          </button>
          <p className="mt-1 font-mono text-[10px] text-neutral">
            Select multiple files to create a project per image, using this
            category/client/order below as a shared template.
          </p>
          {isUploading && (
            <p className="mt-1 font-mono text-xs text-accent">
              {uploadProgress ?? "Uploading…"}
            </p>
          )}
          {form.image_url && (
            <div className="relative mt-3 h-32 w-full overflow-hidden rounded-sm bg-canvas">
              <Image
                src={form.image_url}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-xs text-neutral">
            Display order
          </label>
          <input
            type="number"
            value={form.display_order}
            onChange={(e) =>
              setForm((f) => ({ ...f, display_order: Number(e.target.value) }))
            }
            className="admin-input"
          />
          <p className="mt-1 font-mono text-[10px] text-neutral">
            Lower numbers show first.
          </p>
        </div>

        <label className="flex items-center gap-2 font-mono text-xs text-neutral">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) =>
              setForm((f) => ({ ...f, is_published: e.target.checked }))
            }
          />
          Published (visible on site)
        </label>

        {formError && <p className="font-mono text-xs text-accent">{formError}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="flex-1 rounded-sm bg-accent px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-canvas disabled:opacity-50"
          >
            {isSaving ? "Saving…" : form.id ? "Save changes" : "Add project"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-sm border border-surface-line px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-neutral"
            >
              Cancel
            </button>
          )}
        </div>

        <style jsx global>{`
          .admin-input {
            width: 100%;
            background: var(--canvas);
            border: 1px solid var(--surface-line);
            border-radius: 2px;
            padding: 0.6rem 0.8rem;
            color: var(--paper);
            /* iOS Safari auto-zooms on focus for any field under 16px. */
            font-size: 1rem;
          }
          .admin-input:focus {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
          }
        `}</style>
      </form>

      {/* LIST */}
      <div className="space-y-3">
        {projects.length === 0 && (
          <p className="font-mono text-sm text-neutral">
            No projects yet. Add your first one.
          </p>
        )}
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center gap-4 rounded-sm border border-surface-line bg-surface p-3"
          >
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-canvas">
              <Image
                src={project.image_url}
                alt={project.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm text-paper">{project.title}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                {CATEGORY_LABELS[project.category]}
              </p>
              {!project.is_published && (
                <p className="font-mono text-[10px] uppercase tracking-wide text-neutral">
                  Draft
                </p>
              )}
            </div>
            <button
              onClick={() => startEdit(project)}
              className="rounded-sm border border-surface-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-neutral hover:border-paper/40 hover:text-paper"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(project.id)}
              className="rounded-sm border border-surface-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-accent hover:border-accent"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
