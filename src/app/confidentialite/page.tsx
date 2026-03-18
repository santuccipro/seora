import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de Confidentialité - Seora CV",
  description: "Politique de confidentialité et protection des données personnelles de Seora CV.",
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 mb-8 inline-block">
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 18 mars 2026</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Responsable du traitement</h2>
            <p className="text-gray-600 leading-relaxed">
              Le responsable du traitement des données personnelles collectées via la plateforme Seora CV est la société éditrice de Seora CV (ci-après « l&apos;Éditeur »). Pour toute question relative à la protection de vos données, vous pouvez nous contacter à : dpo@seora-cv.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Données collectées</h2>
            <p className="text-gray-600 leading-relaxed">Dans le cadre de l&apos;utilisation de Seora CV, nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li><strong>Données d&apos;identification :</strong> adresse email, prénom</li>
              <li><strong>Données de CV :</strong> contenu textuel des documents uploadés (CV, lettres de motivation)</li>
              <li><strong>Données d&apos;analyse :</strong> résultats des analyses IA (scores, corrections, recommandations)</li>
              <li><strong>Données de transaction :</strong> historique d&apos;achat de tokens (montant, date, identifiant Stripe)</li>
              <li><strong>Données de connexion :</strong> adresse IP, date et heure de connexion, type de navigateur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Finalités et bases légales</h2>
            <p className="text-gray-600 leading-relaxed">Vos données sont traitées pour les finalités suivantes :</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li><strong>Exécution du contrat :</strong> fourniture des services d&apos;analyse et de correction de CV, gestion de votre compte, traitement des paiements</li>
              <li><strong>Consentement :</strong> envoi de communications marketing (avec possibilité de désinscription à tout moment)</li>
              <li><strong>Intérêt légitime :</strong> amélioration du service, prévention de la fraude, statistiques anonymisées</li>
              <li><strong>Obligation légale :</strong> conservation des données de facturation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Sous-traitants et transferts de données</h2>
            <p className="text-gray-600 leading-relaxed">Pour fournir nos services, nous faisons appel aux sous-traitants suivants :</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li><strong>Supabase (Supabase Inc.) :</strong> hébergement de la base de données — serveurs EU</li>
              <li><strong>Vercel (Vercel Inc.) :</strong> hébergement de l&apos;application web — serveurs EU/US</li>
              <li><strong>Anthropic (Anthropic PBC) :</strong> traitement IA des analyses de CV — serveurs US</li>
              <li><strong>Stripe (Stripe Inc.) :</strong> traitement des paiements — conforme PCI DSS</li>
              <li><strong>Resend (Resend Inc.) :</strong> envoi des emails transactionnels — serveurs US</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-2">
              Certains de ces sous-traitants sont situés aux États-Unis. Les transferts de données sont encadrés par les clauses contractuelles types de la Commission européenne (CCT) ou par le Data Privacy Framework EU-US.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Durée de conservation</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Données de compte :</strong> conservées pendant la durée d&apos;utilisation du service, puis 3 ans après la dernière connexion</li>
              <li><strong>Données de CV et analyses :</strong> conservées tant que le compte est actif, supprimées dans les 30 jours suivant la suppression du compte</li>
              <li><strong>Données de facturation :</strong> conservées 10 ans conformément aux obligations comptables françaises</li>
              <li><strong>Données de connexion :</strong> conservées 12 mois</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Vos droits (RGPD)</h2>
            <p className="text-gray-600 leading-relaxed">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données personnelles</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes ou incomplètes</li>
              <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré et lisible</li>
              <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos données pour motifs légitimes</li>
              <li><strong>Droit à la limitation :</strong> restreindre le traitement de vos données dans certaines conditions</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-2">
              Pour exercer vos droits, envoyez un email à dpo@seora-cv.com avec une copie de votre pièce d&apos;identité. Nous répondrons dans un délai de 30 jours. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Seora CV utilise uniquement des cookies strictement nécessaires au fonctionnement du service (cookie de session d&apos;authentification). Nous n&apos;utilisons pas de cookies publicitaires ni de cookies de suivi tiers. Aucun consentement n&apos;est requis pour ces cookies essentiels conformément à la directive ePrivacy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Sécurité des données</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement des données en transit (HTTPS/TLS), authentification par code de vérification, limitation du nombre de requêtes, accès restreint aux données par le principe du moindre privilège. Les paiements sont traités par Stripe, certifié PCI DSS Level 1.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Traitement IA des données</h2>
            <p className="text-gray-600 leading-relaxed">
              Le contenu de votre CV est envoyé à l&apos;API Anthropic Claude pour analyse. Ce traitement est nécessaire à l&apos;exécution du service. Anthropic ne conserve pas les données transmises au-delà du temps de traitement et ne les utilise pas pour entraîner ses modèles. Pour plus d&apos;informations, consultez la politique de confidentialité d&apos;Anthropic.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Modification de la politique</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous nous réservons le droit de modifier cette politique de confidentialité. En cas de modification substantielle, nous vous en informerons par email ou notification sur la plateforme.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
