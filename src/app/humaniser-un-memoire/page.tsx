import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Humaniser son Mémoire IA — Évite la Détection Turnitin & Compilatio",
  description: "Comment humaniser un mémoire rédigé avec l'IA pour éviter la détection Turnitin et Compilatio. Mode compilatio-proof spécial académique.",
};

export default function HumaniserUnMemoirePage() {
  const faqs = [
    {
      q: "Est-ce qu'on peut humaniser un mémoire entier ?",
      a: "Oui. Il faut traiter le mémoire section par section (introduction, chapitres, conclusion séparément) avec le mode compilatio-proof. Pour un mémoire de 30-50 pages, compter entre 20 et 40 tokens selon la longueur."
    },
    {
      q: "Mon université utilise Compilatio, est-ce que ça marche ?",
      a: "Le mode compilatio-proof de Seora est spécialement calibré pour Compilatio, le logiciel le plus déployé dans les universités françaises. Les tests montrent un score inférieur à 15% dans la majorité des cas après humanisation."
    },
    {
      q: "Est-ce que ça change le fond de mon mémoire ?",
      a: "Non. Seora préserve les arguments, les idées, les citations et les données factuelles. Seule la forme est modifiée : structure de phrases, vocabulaire, transitions — pas le contenu académique."
    },
    {
      q: "Combien de temps pour humaniser un mémoire de 50 pages ?",
      a: "Entre 15 et 30 minutes au total, en traitant les sections une par une. Chaque section de 500-800 mots est traitée en 20-30 secondes."
    },
    {
      q: "Ma soutenance est demain, c'est trop tard ?",
      a: "Non. Seora traite chaque section en moins de 30 secondes. Un mémoire de 30 pages peut être intégralement humanisé en moins d'une heure."
    },
    {
      q: "Qu'est-ce qui se passe si je dépasse le score Turnitin ?",
      a: "Si après une première humanisation le score reste élevé sur certaines sections, applique une seconde passe avec le mode aggressive. La combinaison balanced + aggressive réduit le score à moins de 20% dans la quasi-totalité des cas."
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <Link href="/" className="text-indigo-600 font-bold text-lg">Seora</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
          Humaniser son Mémoire — Évite la Détection IA à la Soutenance
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Tu as utilisé ChatGPT ou Claude pour t&apos;aider dans ton mémoire et Turnitin ou Compilatio risque de le détecter ? Seora humanise ton texte section par section pour le rendre indétectable. Mode compilatio-proof spécial académique.
        </p>

        <Link href="/humanizer" className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition-opacity mb-8">
          Humaniser mon mémoire →
        </Link>

        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-10 text-sm text-orange-700">
          <strong>⚡ Urgent avant soutenance ?</strong> Un mémoire de 30 pages traité en moins d&apos;une heure. 150 tokens offerts à l&apos;inscription.
        </div>

        <div className="prose prose-gray max-w-none">
          <h2>Pourquoi les universités détectent-elles l&apos;IA dans les mémoires ?</h2>
          <p>
            Depuis 2023, la quasi-totalité des universités françaises et grandes écoles ont intégré des modules de détection IA dans leurs logiciels anti-plagiat habituels. Turnitin AI Detection est déployé dans les universités anglophones et certaines écoles de commerce, tandis que Compilatio — développé en France — est le standard dans les universités publiques françaises.
          </p>
          <p>
            Ces outils attribuent un score de probabilité d&apos;IA à chaque section du document. Un score supérieur à 20-30% déclenche généralement un signalement automatique au jury ou au directeur de mémoire.
          </p>

          <h2>Comment humaniser un mémoire efficacement ?</h2>
          <p>La méthode recommandée pour un mémoire complet :</p>
          <ol>
            <li><strong>Identifie les sections à risque</strong> : commence par tester ton mémoire avec le détecteur IA de Seora pour identifier les parties avec un score élevé.</li>
            <li><strong>Traite section par section</strong> : introduction, chapitres, conclusion. Ne traite pas tout le mémoire en une seule fois — la qualité du résultat est meilleure sur des blocs de 500 à 1 000 mots.</li>
            <li><strong>Utilise le mode compilatio-proof</strong> : si ton université utilise Compilatio, ce mode est calibré spécifiquement pour ce détecteur.</li>
            <li><strong>Relis après humanisation</strong> : vérifie que le sens est préservé et corrige les éventuelles maladresses de formulation.</li>
            <li><strong>Teste à nouveau</strong> : passe le texte humanisé dans le détecteur Seora pour confirmer que le score a bien baissé.</li>
          </ol>

          <h2>Quelle partie de mon mémoire humaniser en priorité ?</h2>
          <p>
            Les sections les plus à risque sont généralement : l&apos;introduction et la conclusion (souvent entièrement générées par IA), les parties &quot;revue de littérature&quot; ou &quot;état de l&apos;art&quot;, et les transitions entre parties. Les sections avec des données chiffrées, tableaux ou analyses originales sont généralement moins détectées car elles contiennent des informations spécifiques que l&apos;IA ne génère pas de façon homogène.
          </p>

          <h2>Combien coûte l&apos;humanisation d&apos;un mémoire ?</h2>
          <p>
            Seora offre 150 tokens à l&apos;inscription, ce qui représente entre 5 et 18 humanisations complètes selon le mode choisi. Pour un mémoire de 50 pages traité section par section en mode compilatio-proof, compter environ 40 à 80 tokens selon la longueur des sections — généralement couvert par les tokens offerts ou un petit pack supplémentaire.
          </p>
        </div>

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

        <div className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Commence maintenant</h2>
          <p className="text-gray-500 mb-4 text-sm">150 tokens offerts. Mode compilatio-proof disponible.</p>
          <Link href="/humanizer" className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">
            Humaniser mon mémoire →
          </Link>
        </div>
      </div>
    </main>
  );
}
