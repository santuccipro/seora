import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions Légales - Seora CV",
  description: "Mentions légales de la plateforme Seora CV.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 mb-8 inline-block">
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentions Légales</h1>
        <p className="text-sm text-gray-500 mb-10">Conformément à l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Éditeur du site</h2>
            <div className="text-gray-600 leading-relaxed space-y-1">
              <p><strong>Raison sociale :</strong> [À compléter — nom de la société ou de l&apos;auto-entrepreneur]</p>
              <p><strong>Forme juridique :</strong> [À compléter — SAS, SARL, auto-entrepreneur, etc.]</p>
              <p><strong>SIRET :</strong> [À compléter]</p>
              <p><strong>Siège social :</strong> [À compléter — adresse complète]</p>
              <p><strong>Directeur de la publication :</strong> [À compléter — nom du responsable]</p>
              <p><strong>Email :</strong> contact@seora-cv.com</p>
              <p><strong>Numéro TVA intracommunautaire :</strong> [À compléter si applicable]</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Hébergeur</h2>
            <div className="text-gray-600 leading-relaxed space-y-1">
              <p><strong>Raison sociale :</strong> Vercel Inc.</p>
              <p><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
              <p><strong>Site web :</strong> vercel.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Base de données</h2>
            <div className="text-gray-600 leading-relaxed space-y-1">
              <p><strong>Hébergeur :</strong> Supabase Inc.</p>
              <p><strong>Localisation :</strong> Union Européenne</p>
              <p><strong>Site web :</strong> supabase.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Propriété intellectuelle</h2>
            <p className="text-gray-600 leading-relaxed">
              L&apos;ensemble du contenu du site Seora CV (textes, graphismes, logo, images, logiciels) est protégé par le droit d&apos;auteur et le droit des marques. Toute reproduction, représentation, modification ou exploitation non autorisée de tout ou partie du site est interdite et peut constituer une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la Propriété Intellectuelle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Données personnelles</h2>
            <p className="text-gray-600 leading-relaxed">
              Le traitement des données personnelles est détaillé dans notre{" "}
              <Link href="/confidentialite" className="text-indigo-600 hover:text-indigo-800 underline">
                Politique de Confidentialité
              </Link>
              . Conformément au RGPD et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez de droits sur vos données personnelles que vous pouvez exercer en nous contactant à dpo@seora-cv.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Seora CV utilise uniquement des cookies strictement nécessaires au fonctionnement du service d&apos;authentification. Aucun cookie publicitaire ou de suivi n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Limitation de responsabilité</h2>
            <p className="text-gray-600 leading-relaxed">
              Les informations et analyses fournies par Seora CV sont générées par intelligence artificielle et présentées à titre indicatif. L&apos;éditeur s&apos;efforce de fournir des informations aussi précises que possible mais ne saurait être tenu responsable des omissions, inexactitudes ou résultats de l&apos;utilisation de ces informations. L&apos;utilisation du service se fait sous l&apos;entière responsabilité de l&apos;utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Droit applicable</h2>
            <p className="text-gray-600 leading-relaxed">
              Les présentes mentions légales sont régies par le droit français. Tout litige relatif à l&apos;utilisation du site sera soumis à la compétence exclusive des tribunaux français.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
