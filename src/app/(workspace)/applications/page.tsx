"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  X,
  ExternalLink,
  Trash2,
  Loader2,
  MapPin,
  Calendar,
  Banknote,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CV_SECTOR_LIST } from "@/lib/cv-criteria";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status =
  | "planned"
  | "sent"
  | "replied"
  | "interview"
  | "offer"
  | "rejected";

interface JobApplication {
  id: string;
  userId: string;
  companyName: string;
  position: string;
  sector: string | null;
  status: Status;
  appliedAt: string | null;
  interviewDate: string | null;
  jobUrl: string | null;
  salary: string | null;
  location: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  cvAnalysisId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Kanban config ────────────────────────────────────────────────────────────

const COLUMNS: {
  key: Status;
  label: string;
  dot: string;
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
}[] = [
  {
    key: "planned",
    label: "À postuler",
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100",
    badgeText: "text-blue-700",
  },
  {
    key: "sent",
    label: "Envoyé",
    dot: "bg-indigo-500",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100",
    badgeText: "text-indigo-700",
  },
  {
    key: "replied",
    label: "Réponse reçue",
    dot: "bg-yellow-500",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100",
    badgeText: "text-yellow-700",
  },
  {
    key: "interview",
    label: "Entretien",
    dot: "bg-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100",
    badgeText: "text-orange-700",
  },
  {
    key: "offer",
    label: "Offre reçue",
    dot: "bg-green-500",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100",
    badgeText: "text-green-700",
  },
  {
    key: "rejected",
    label: "Refusé",
    dot: "bg-red-400",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100",
    badgeText: "text-red-700",
  },
];

const STATUS_LABELS: Record<Status, string> = {
  planned: "À postuler",
  sent: "Envoyé",
  replied: "Réponse reçue",
  interview: "Entretien",
  offer: "Offre reçue",
  rejected: "Refusé",
};

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  companyName: "",
  position: "",
  sector: "",
  status: "planned" as Status,
  appliedAt: "",
  interviewDate: "",
  salary: "",
  location: "",
  jobUrl: "",
  contactName: "",
  contactEmail: "",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          className="min-w-[280px] max-w-[280px] bg-gray-100 rounded-2xl p-3 animate-pulse"
        >
          <div className="h-6 bg-gray-200 rounded mb-3 w-32" />
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl mb-2" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  form: typeof EMPTY_FORM;
  onChange: (f: typeof EMPTY_FORM) => void;
  onSubmit: () => void;
  onClose: () => void;
  onDelete?: () => void;
  submitting: boolean;
}

function AppModal({
  title,
  form,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  submitting,
}: ModalProps) {
  const set = (k: keyof typeof EMPTY_FORM, v: string) =>
    onChange({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Entreprise */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Entreprise <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Ex: Google France"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          {/* Poste */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Poste <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
              placeholder="Ex: Développeur Full Stack"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          {/* Secteur + Statut row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Secteur
              </label>
              <select
                value={form.sector}
                onChange={(e) => set("sector", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                <option value="">— Choisir —</option>
                {CV_SECTOR_LIST.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as Status)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date de candidature
              </label>
              <input
                type="date"
                value={form.appliedAt}
                onChange={(e) => set("appliedAt", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date d&apos;entretien
              </label>
              <input
                type="date"
                value={form.interviewDate}
                onChange={(e) => set("interviewDate", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Salaire + Localisation row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Salaire visé
              </label>
              <input
                type="text"
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder="Ex: 45k€"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Localisation
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Ex: Paris 8e"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* URL offre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              URL de l&apos;offre
            </label>
            <input
              type="url"
              value={form.jobUrl}
              onChange={(e) => set("jobUrl", e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contact (nom)
              </label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Ex: Marie Dupont"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contact (email)
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="rh@company.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Informations utiles, suite à donner..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !form.companyName || !form.position}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AppCard({
  app,
  onDragStart,
  onClick,
  sectorLabel,
}: {
  app: JobApplication;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (app: JobApplication) => void;
  sectorLabel: string | null;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, app.id)}
      onClick={() => onClick(app)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all select-none group"
    >
      {/* Company + Position */}
      <p className="font-bold text-gray-900 text-sm leading-tight truncate">
        {app.companyName}
      </p>
      <p className="text-xs text-gray-500 mt-0.5 truncate">{app.position}</p>

      {/* Meta badges */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {app.location && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
            <MapPin className="h-3 w-3" />
            {app.location}
          </span>
        )}
        {app.salary && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
            <Banknote className="h-3 w-3" />
            {app.salary}
          </span>
        )}
        {app.appliedAt && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="h-3 w-3" />
            {formatDate(app.appliedAt)}
          </span>
        )}
      </div>

      {/* Sector badge */}
      {sectorLabel && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
            <Tag className="h-2.5 w-2.5" />
            {sectorLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [modalApp, setModalApp] = useState<JobApplication | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Status>("planned");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  // Drag state
  const dragId = useRef<string | null>(null);

  // ── Sector label lookup ──
  const sectorMap = Object.fromEntries(CV_SECTOR_LIST.map((s) => [s.key, s.label]));

  // ── Load applications ──
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetchApplications();
  }, [sessionStatus]);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/job-applications");
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      setApplications(data);
    } catch {
      toast.error("Impossible de charger les candidatures");
    } finally {
      setLoading(false);
    }
  }

  // ── Open add modal ──
  function openAdd(status: Status = "planned") {
    setDefaultStatus(status);
    setForm({ ...EMPTY_FORM, status });
    setModalApp(null);
    setModalMode("add");
  }

  // ── Open edit modal ──
  function openEdit(app: JobApplication) {
    setModalApp(app);
    setForm({
      companyName: app.companyName,
      position: app.position,
      sector: app.sector ?? "",
      status: app.status,
      appliedAt: toInputDate(app.appliedAt),
      interviewDate: toInputDate(app.interviewDate),
      salary: app.salary ?? "",
      location: app.location ?? "",
      jobUrl: app.jobUrl ?? "",
      contactName: app.contactName ?? "",
      contactEmail: app.contactEmail ?? "",
      notes: app.notes ?? "",
    });
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setModalApp(null);
    setForm({ ...EMPTY_FORM });
  }

  // ── Create ──
  async function handleCreate() {
    if (!form.companyName || !form.position) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sector: form.sector || null,
          appliedAt: form.appliedAt || null,
          interviewDate: form.interviewDate || null,
          salary: form.salary || null,
          location: form.location || null,
          jobUrl: form.jobUrl || null,
          contactName: form.contactName || null,
          contactEmail: form.contactEmail || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setApplications((prev) => [created, ...prev]);
      toast.success("Candidature ajoutée");
      closeModal();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Update ──
  async function handleUpdate() {
    if (!modalApp || !form.companyName || !form.position) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/job-applications/${modalApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sector: form.sector || null,
          appliedAt: form.appliedAt || null,
          interviewDate: form.interviewDate || null,
          salary: form.salary || null,
          location: form.location || null,
          jobUrl: form.jobUrl || null,
          contactName: form.contactName || null,
          contactEmail: form.contactEmail || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      toast.success("Candidature mise à jour");
      closeModal();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!modalApp) return;
    if (!confirm("Supprimer cette candidature ?")) return;
    try {
      const res = await fetch(`/api/job-applications/${modalApp.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setApplications((prev) => prev.filter((a) => a.id !== modalApp.id));
      toast.success("Candidature supprimée");
      closeModal();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  // ── Drag & Drop ──
  function handleDragStart(e: React.DragEvent, id: string) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, targetStatus: Status) {
    e.preventDefault();
    const id = dragId.current;
    if (!id) return;

    const app = applications.find((a) => a.id === id);
    if (!app || app.status === targetStatus) return;

    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: targetStatus } : a))
    );

    try {
      const res = await fetch(`/api/job-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      toast.success(`Déplacé vers "${STATUS_LABELS[targetStatus]}"`);
    } catch {
      // Rollback
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: app.status } : a))
      );
      toast.error("Erreur lors du déplacement");
    }

    dragId.current = null;
  }

  // ── Auth guard ──
  if (sessionStatus === "loading") {
    return (
      <div className="p-6 pt-20 lg:p-8 lg:pt-8">
        <KanbanSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 pt-20 lg:p-8 lg:pt-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Connectez-vous pour accéder à vos candidatures.</p>
      </div>
    );
  }

  const total = applications.length;

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-20 lg:top-0 pt-16 lg:pt-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Briefcase className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900">Mes candidatures</h1>
            <p className="text-xs text-gray-400">
              {total === 0
                ? "Aucune candidature"
                : `${total} candidature${total > 1 ? "s" : ""} au total`}
            </p>
          </div>
        </div>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle candidature
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 p-4 lg:p-6 overflow-x-auto">
        {loading ? (
          <KanbanSkeleton />
        ) : (
          <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
            {COLUMNS.map((col) => {
              const colApps = applications.filter((a) => a.status === col.key);
              return (
                <div
                  key={col.key}
                  className="min-w-[280px] max-w-[280px] flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between rounded-t-2xl px-3 py-2.5 ${col.bg} border ${col.border} border-b-0`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.dot} flex-shrink-0`} />
                      <span className="text-sm font-bold text-gray-800 truncate">
                        {col.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-black px-1.5 py-0.5 rounded-full ${col.badge} ${col.badgeText}`}
                      >
                        {colApps.length}
                      </span>
                      <button
                        onClick={() => openAdd(col.key)}
                        className="h-6 w-6 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-indigo-600 transition-colors"
                        title="Ajouter"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div
                    className={`flex-1 rounded-b-2xl border ${col.border} overflow-y-auto`}
                    style={{ maxHeight: "calc(100vh - 200px)" }}
                  >
                    <div className="p-2 space-y-2">
                      {colApps.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-400">Aucune candidature</p>
                        </div>
                      ) : (
                        colApps.map((app) => (
                          <AppCard
                            key={app.id}
                            app={app}
                            onDragStart={handleDragStart}
                            onClick={openEdit}
                            sectorLabel={
                              app.sector ? (sectorMap[app.sector] ?? null) : null
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalMode === "add" && (
        <AppModal
          title="Nouvelle candidature"
          form={form}
          onChange={setForm}
          onSubmit={handleCreate}
          onClose={closeModal}
          submitting={submitting}
        />
      )}
      {modalMode === "edit" && modalApp && (
        <AppModal
          title={`${modalApp.companyName} — ${modalApp.position}`}
          form={form}
          onChange={setForm}
          onSubmit={handleUpdate}
          onClose={closeModal}
          onDelete={handleDelete}
          submitting={submitting}
        />
      )}
    </div>
  );
}
