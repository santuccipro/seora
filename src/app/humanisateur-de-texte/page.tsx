import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Humanisateur de Texte IA Gratuit — Indétectable Turnitin & Compilatio",
  description: "Humanise ton texte généré par IA en 30 secondes. Passe Turnitin, Compilatio, GPTZero sans être détecté. Gratuit pour les étudiants français.",
};

export default function HumanisateurDeTextePage() {
  const faqs = [
    {
      q: "C'est quoi un humanisateur de texte IA ?",
      a: "Un humanisateur de texte IA est un outil qui reformule un texte généré par une intelligence artificielle (ChatGPT, Claude, Gemini...) pour le rendre indétectable par les logiciels de détection IA comme Turnitin, Compilatio ou GPTZero. Il modifie le style, le vocabulaire et la structure tout en conservant le sens original."
    },
    {
      q: "Est-ce que Turnitin peut détecter les textes humanisés ?",
      a: "Après humanisation avec le mode 'aggressive' ou 'compilatio-proof' de Seora, les tests montrent un score inférieur à 20% sur Turnitin et Compilatio. Le score exact dépend de la longueur du texte, du mode d'humanisation choisi et de la version du détecteur utilisée par ton établissement."
    },
    {
      q: "L'humanisateur de texte est-il gratuit ?",
      a: "Seora propose 150 tokens gratuits à l'inscription, ce qui représente plusieurs humanisations complètes. Le mode basic coûte 2 tokens, balanced 3 tokens, aggressive 5 tokens et compilatio-proof 8 tokens. Des packs de tokens supplémentaires sont disponibles si nécessaire."
    },
    {
      q: "Ça marche pour les mémoires et rapports de stage ?",
      a: "Oui. Le mode 'compilatio-proof' est spécialement calibré pour les documents académiques longs soumis aux universités françaises et grandes écoles. Il traite les sections en plusieurs passes pour garantir une cohérence stylistique sur l'ensemble du document."
    },
    {
      q: "Quels détecteurs IA Seora contourne-t-il ?",
      a: "Seora est optimisé pour contourner Turnitin AI Detection, Compilatio, GPTZero, Copyleaks et Winston AI — les 5 outils les plus utilisés dans les universités et grandes écoles en France et en Europe."
    },
    {
      q: "Est-ce que le sens de mon texte est conservé ?",
      a: "Oui. L'algorithme préserve les idées, arguments et informations factuelles. Seules la formulation, la structure des phrases et le vocabulaire sont modifiés pour imiter un style rédactionnel humain naturel."
    },
    {
      q: "Quelle est la différence avec ChatGPT pour réécrire ?",
      a: "ChatGPT réécrit le texte mais produit lui-même un texte IA — qui sera détecté comme tel. Seora est spécifiquement entraîné pour produire une sortie statistiquement similaire à de l'écriture humaine, ce que ChatGPT ne fait pas."
    },
    {
      q: "Mon texte est-il stocké ou partagé ?",
      a: "Non. Les textes soumis sont utilisés uniquement pour le traitement et ne sont pas stockés ni partagés. Seora respecte le RGPD."
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header minimal */}
      <header className="border-b border-gray-100 py-4 px-6">
        <Link href="/" className="text-indigo-600 font-bold text-lg">Seora</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
          Humanisateur de Texte IA — Indétectable Turnitin & Compilatio
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Transforme ton texte généré par ChatGPT, Claude ou Gemini en contenu 100% humain, indétectable par les principaux logiciels de détection IA. Résultat en 30 secondes.
        </p>

        {/* CTA principal */}
        <Link
          href="/humanizer"
          className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition-opacity mb-12"
        >
          Humaniser mon texte gratuitement →
        </Link>

        {/* Badges détecteurs */}
        <div className="flex flex-wrap gap-2 mb-12">
          {["✓ Turnitin", "✓ Compilatio", "✓ GPTZero", "✓ Copyleaks", "✓ Winston AI"].map((d) => (
            <span key={d} className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full text-sm font-medium">{d}</span>
          ))}
        </div>

        {/* Contenu SEO */}
        <div className="prose prose-gray max-w-none">
          <h2>Qu&apos;est-ce qu&apos;un humanisateur de texte IA ?</h2>
          <p>
            Un humanisateur de texte IA est un outil qui reformule automatiquement les textes générés par une intelligence artificielle pour les rendre indétectables par les logiciels de détection IA. Concrètement : tu colles ton texte ChatGPT, et tu récupères un texte qui, aux yeux de Turnitin ou Compilatio, semble avoir été écrit par un humain.
          </p>
          <p>
            La demande explose en France depuis que les universités et grandes écoles ont généralisé l&apos;utilisation de Turnitin AI Detection et Compilatio dans leur processus d&apos;évaluation. Les étudiants qui utilisent l&apos;IA pour gagner du temps sur leurs mémoires, dissertations ou rapports de stage se retrouvent avec des textes signalés à 80-90% de probabilité d&apos;IA.
          </p>

          <h2>Comment fonctionne l&apos;humanisation de texte ?</h2>
          <p>
            Les détecteurs IA comme Turnitin et GPTZero analysent des caractéristiques statistiques spécifiques :
          </p>
          <ul>
            <li><strong>Perplexité</strong> : un texte IA choisit toujours le mot le plus probable, ce qui donne une perplexité basse. Un humain fait des choix moins prévisibles.</li>
            <li><strong>Burstiness</strong> : les humains alternent phrases courtes et longues de façon irrégulière. L&apos;IA tend vers une longueur de phrase uniforme.</li>
            <li><strong>Distribution des tokens</strong> : les modèles IA ont des patterns de répétition lexicale caractéristiques.</li>
          </ul>
          <p>
            Seora modifie ces trois dimensions de ton texte pour le rendre statistiquement similaire à de l&apos;écriture humaine, tout en préservant le sens et les idées originales.
          </p>

          <h2>Les 4 modes d&apos;humanisation</h2>
          <p>Seora propose 4 niveaux d&apos;intensité selon ton besoin :</p>
          <ul>
            <li><strong>Basic (2 tokens)</strong> : reformulation légère. Pour les textes déjà partiellement rédigés à la main ou quand le score est inférieur à 40%.</li>
            <li><strong>Balanced (3 tokens)</strong> : le mode recommandé. Équilibre entre transformation et préservation du style original.</li>
            <li><strong>Aggressive (5 tokens)</strong> : réécriture profonde. Pour les textes 100% IA ou quand Turnitin signale plus de 70%.</li>
            <li><strong>Compilatio-proof (8 tokens)</strong> : spécialement calibré pour les universités françaises. Plusieurs passes de reformulation avec variabilité maximale.</li>
          </ul>

          <h2>Humaniser un mémoire ou rapport de stage</h2>
          <p>
            Les documents académiques longs présentent un défi spécifique : il faut maintenir une cohérence de style sur l&apos;ensemble du document tout en humanisant chaque section. Seora traite les textes par blocs sémantiques et maintient un &quot;profil stylistique&quot; cohérent sur l&apos;ensemble du document.
          </p>
          <p>
            Pour un mémoire de 30 à 50 pages, nous recommandons de traiter chapitre par chapitre avec le mode &quot;compilatio-proof&quot; et de relire chaque section pour corriger les éventuelles maladresses.
          </p>

          <h2>Seora vs les autres humanisateurs</h2>
          <p>
            Il existe plusieurs humanisateurs sur le marché (Undetectable.ai, HIX Bypass, Rewordify). Seora se distingue par son focus sur le marché français et ses modes calibrés spécifiquement pour Compilatio — le détecteur le plus utilisé dans les universités françaises — et par son écosystème complet (CV, lettre, LinkedIn) qui en fait la plateforme de référence pour les étudiants en France.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Questions fréquentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="border border-gray-200 rounded-xl p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">{faq.q}</summary>
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Schema JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map(faq => ({
                "@type": "Question",
                name: faq.q,
                acceptedAnswer: { "@type": "Answer", text: faq.a }
              }))
            })
          }}
        />

        {/* CTA bas de page */}
        <div className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Prêt à humaniser ton texte ?</h2>
          <p className="text-gray-500 mb-4 text-sm">150 tokens offerts à l&apos;inscription — plusieurs humanisations gratuites.</p>
          <Link
            href="/humanizer"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </div>
    </main>
  );
}
