"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  BarChart3,
  Users,
  FileText,
  Coins,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface Stats {
  users: { total: number; thisMonth: number; thisWeek: number };
  analyses: { total: number; thisMonth: number; coverLetters: number; jobMatches: number; avgScore: number };
  revenue: { total: number; thisMonth: number };
  recentUsers: { id: string; name: string | null; email: string; tokens: number; createdAt: string }[];
  recentPurchases: {
    id: string; amount: number; price: number; createdAt: string;
    user: { name: string | null; email: string };
  }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {sub && <span className="text-xs font-medium text-green-600 bg-green-50 rounded-full px-2 py-1">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") {
      fetch("/api/admin/stats")
        .then((r) => {
          if (r.status === 403) {
            setError("Accès réservé aux administrateurs");
            setLoading(false);
            return null;
          }
          return r.json();
        })
        .then((d) => {
          if (d) setStats(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <p className="text-sm text-red-500 mt-2">
            Pour activer l&apos;accès admin, passez votre compte en isAdmin=true dans la base de données.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-indigo-500" />
            Dashboard Admin
          </h1>
          <p className="mt-1 text-gray-600">Métriques business en temps réel</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Utilisateurs" value={stats.users.total} sub={`+${stats.users.thisWeek} cette semaine`} color="bg-indigo-500" />
          <StatCard icon={FileText} label="Analyses CV" value={stats.analyses.total} sub={`+${stats.analyses.thisMonth} ce mois`} color="bg-cyan-500" />
          <StatCard icon={Coins} label="Revenus total" value={`${stats.revenue.total.toFixed(2)} \u20ac`} sub={`+${stats.revenue.thisMonth.toFixed(2)} \u20ac ce mois`} color="bg-green-500" />
          <StatCard icon={TrendingUp} label="Score moyen" value={`${stats.analyses.avgScore}/100`} color="bg-purple-500" />
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.analyses.coverLetters}</p>
            <p className="text-sm text-gray-500">Lettres de motivation</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.analyses.jobMatches}</p>
            <p className="text-sm text-gray-500">Matchings offre/CV</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.users.thisMonth}</p>
            <p className="text-sm text-gray-500">Nouveaux users ce mois</p>
          </div>
        </div>

        {/* Recent users */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Derniers inscrits</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{u.tokens}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent purchases */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Derniers achats</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.user.name || p.user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.amount}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">{(p.price / 100).toFixed(2)} €</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
