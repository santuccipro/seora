import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog Seora — Guides pour étudiants : IA, CV, lettre, Turnitin",
  description: "Guides pratiques pour étudiants et alternants : humaniser un texte IA, passer Turnitin, rédiger une lettre de motivation sans tics ChatGPT, réussir son entretien.",
};

const POSTS = [
  {
    slug: "humaniser-texte-ia-turnitin",
    title: "Comment humaniser un texte IA pour passer Turnitin en 2026",
    date: "18 juillet 2026",
    readTime: "8 min",
    excerpt: "Turnitin détecte ton texte ChatGPT ? Voici la méthode complète pour réécrire ton mémoire ou rapport de stage et obtenir un score inférieur à 20% — sans perdre le sens.",
    category: "Humanisation IA",
    categoryColor: "bg-emerald-100 text-emerald-700",
  },
  {
    slug: "lettre-motivation-ia-tics-chatgpt",
    title: "Lettre de motivation avec ChatGPT : éviter les tics de langage IA",
    date: "15 juillet 2026",
    readTime: "6 min",
    excerpt: "\"En tant que candidat passionné\", \"mes atouts précieux\"... Les recruteurs reconnaissent immédiatement ces formules. Comment écrire une lettre IA qui sonne vraiment humaine ?",
    category: "Lettre de motivation",
    categoryColor: "bg-blue-100 text-blue-700",
  },
  {
    slug: "passer-compilatio-memoire-ia",
    title: "Passer sous Compilatio avec un mémoire partiellement rédigé par IA",
    date: "10 juillet 2026",
    readTime: "7 min",
    excerpt: "Compilatio est le détecteur IA le plus utilisé dans les universités françaises. Voici comment il fonctionne, ce qu'il détecte vraiment, et la stratégie section par section pour y passer.",
    category: "Académique",
    categoryColor: "bg-orange-100 text-orange-700",
  },
  {
    slug: "cv-etudiant-decrocher-entretien",
    title: "CV étudiant en 2026 : ce que les recruteurs regardent en 6 secondes",
    date: "5 juillet 2026",
    readTime: "5 min",
    excerpt: "Un recruteur passe en moyenne 6 secondes sur un CV. Ce qu'il cherche en premier, les erreurs qui font supprimer un CV en stage, et comment l'IA peut t'aider à corriger les points bloquants.",
    category: "CV & Candidature",
    categoryColor: "bg-indigo-100 text-indigo-700",
  },
  {
    slug: "detection-ia-universites-france-2026",
    title: "Détection IA dans les universités françaises : ce qu'on sait en 2026",
    date: "1 juillet 2026",
    readTime: "9 min",
    excerpt: "Quelles universités utilisent Turnitin ? Compilatio ? GPTZero ? Quel score déclenche une sanction ? Tour d'horizon des pratiques dans les établissements français en 2026.",
    category: "Actualité",
    categoryColor: "bg-violet-100 text-violet-700",
  },
  {
    slug: "alternance-cv-lettre-secteur-finance",
    title: "Alternance en finance : CV et lettre de motivation qui convertissent en 2026",
    date: "22 juillet 2026",
    readTime: "7 min",
    excerpt: "BNP, SG, AXA, Natixis... Les recruteurs en finance reçoivent des centaines de candidatures. Voici exactement ce que ton CV et ta lettre doivent contenir pour décrocher un entretien.",
    category: "CV & Candidature",
    categoryColor: "bg-indigo-100 text-indigo-700",
  },
  {
    slug: "rapport-stage-ia-comment-ecrire",
    title: "Rapport de stage : utiliser l'IA sans se faire prendre en 2026",
    date: "21 juillet 2026",
    readTime: "8 min",
    excerpt: "ChatGPT peut t'aider à rédiger ton rapport de stage — mais mal utilisé, il te fait griller. Voici la méthode pour garder la valeur de l'IA sans déclencher les détecteurs.",
    category: "Académique",
    categoryColor: "bg-orange-100 text-orange-700",
  },
  {
    slug: "entretien-embauche-questions-pieges-alternance",
    title: "Questions pièges en entretien d'alternance : les 10 réponses qui font la différence",
    date: "20 juillet 2026",
    readTime: "9 min",
    excerpt: "\"Pourquoi vous et pas un autre ?\" \"Où vous voyez-vous dans 5 ans ?\" Ces questions piègent des centaines de candidats. Voici les réponses STAR qui convainquent les recruteurs.",
    category: "Entretien",
    categoryColor: "bg-pink-100 text-pink-700",
  },
  {
    slug: "cv-competences-ia-ats-2026",
    title: "CV et ATS en 2026 : les compétences IA qui font passer les filtres",
    date: "19 juillet 2026",
    readTime: "6 min",
    excerpt: "70% des CV sont éliminés par un ATS avant d'arriver sur le bureau d'un recruteur. Mots-clés, format, compétences IA — ce qu'il faut mettre pour passer les filtres en 2026.",
    category: "CV & Candidature",
    categoryColor: "bg-indigo-100 text-indigo-700",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <Link href="/" className="text-indigo-600 font-bold text-lg">Seora</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Blog Seora</h1>
          <p className="text-gray-500 text-lg">Guides pratiques pour étudiants, alternants et jeunes diplômés.</p>
        </div>

        <div className="space-y-8">
          {POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <article className="border border-gray-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}>{post.category}</span>
                  <span className="text-xs text-gray-400">{post.date} · {post.readTime} de lecture</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{post.title}</h2>
                <p className="text-gray-500 text-sm leading-relaxed">{post.excerpt}</p>
                <p className="mt-3 text-sm font-semibold text-indigo-600">Lire l&apos;article →</p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
