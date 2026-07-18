"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  createProject,
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

  function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
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

    // Multiple files: upload + create one project per image, using the
    // current category/client/order/published fields as a shared template.
    setIsUploading(true);
    setFormError(null);

    const created: Project[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1} of ${files.length}…`);

      const uploadResult = await uploadFile(file);
      if (uploadResult.error || !uploadResult.url) {
        setFormError(`${file.name}: ${uploadResult.error ?? "Upload failed."}`);
        break;
      }

      const title = form.title
        ? `${form.title} ${i + 1}`
        : file.name.replace(/\.[^/.]+$/, "");

      const payload = {
        title,
        description: form.description,
        category: form.category,
        client_name: form.client_name,
        image_url: uploadResult.url,
        website_url: form.website_url,
        display_order: form.display_order,
        is_published: form.is_published,
      };

      const result = await createProject(payload);
      if (result.error) {
        setFormError(`${file.name}: ${result.error}`);
        break;
      }

      created.push({
        ...payload,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (created.length > 0) {
      setProjects((prev) => [...created.reverse(), ...prev]);
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
            font-size: 0.875rem;
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
