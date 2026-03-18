import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - Seora CV",
  description: "Conditions générales d'utilisation de la plateforme Seora CV.",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 mb-8 inline-block">
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 18 mars 2026</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Objet du service</h2>
            <p className="text-gray-600 leading-relaxed">
              Seora CV est une plateforme en ligne proposant des services d&apos;analyse, de correction et d&apos;optimisation de CV et documents professionnels par intelligence artificielle. Le service comprend notamment : l&apos;analyse de CV avec scoring détaillé, la génération de corrections personnalisées, la création de lettres de motivation, le matching CV/offre d&apos;emploi, la reformulation de texte, l&apos;humanisation de contenu et la génération d&apos;emails professionnels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Inscription et compte utilisateur</h2>
            <p className="text-gray-600 leading-relaxed">
              L&apos;accès aux services nécessite la création d&apos;un compte via une adresse email valide. L&apos;utilisateur s&apos;engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants de connexion. Chaque utilisateur reçoit 5 tokens gratuits à l&apos;inscription. L&apos;utilisateur est seul responsable de l&apos;utilisation de son compte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Système de tokens</h2>
            <p className="text-gray-600 leading-relaxed">
              Les services sont accessibles via un système de tokens (crédits). Chaque fonctionnalité consomme un nombre défini de tokens (de 1 à 3 selon le service). Les tokens peuvent être obtenus gratuitement à l&apos;inscription, par parrainage, ou achetés via notre système de paiement sécurisé. Les tokens achetés n&apos;ont pas de date d&apos;expiration. Les tokens ne sont ni remboursables, ni transférables, ni échangeables contre de l&apos;argent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Utilisation du service</h2>
            <p className="text-gray-600 leading-relaxed">
              L&apos;utilisateur s&apos;engage à utiliser le service conformément à sa destination et à ne pas : tenter de contourner les limitations techniques du service, utiliser le service à des fins illicites ou contraires aux bonnes mœurs, revendre ou redistribuer les résultats générés à des fins commerciales sans autorisation, surcharger délibérément les serveurs par des requêtes excessives.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Propriété intellectuelle</h2>
            <p className="text-gray-600 leading-relaxed">
              L&apos;utilisateur conserve l&apos;entière propriété de ses documents uploadés (CV, lettres, etc.). Les contenus générés par l&apos;IA (corrections, lettres de motivation, analyses) sont la propriété de l&apos;utilisateur qui les a commandés. La plateforme Seora CV, son code, son design et sa marque restent la propriété exclusive de l&apos;éditeur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Limitation de responsabilité</h2>
            <p className="text-gray-600 leading-relaxed">
              Les analyses et recommandations fournies par Seora CV sont générées par intelligence artificielle à titre indicatif. Elles ne constituent en aucun cas un conseil professionnel en recrutement ou en ressources humaines. Seora CV ne garantit pas l&apos;obtention d&apos;un emploi suite à l&apos;utilisation du service. L&apos;éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l&apos;utilisation du service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Paiement et facturation</h2>
            <p className="text-gray-600 leading-relaxed">
              Les paiements sont traités de manière sécurisée par Stripe. Les prix sont indiqués en euros TTC. Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas aux services de contenu numérique dont l&apos;exécution a commencé avec l&apos;accord du consommateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Programme de parrainage</h2>
            <p className="text-gray-600 leading-relaxed">
              Le programme de parrainage permet aux utilisateurs de gagner 2 tokens en invitant de nouveaux utilisateurs. Le filleul reçoit également 2 tokens bonus. L&apos;éditeur se réserve le droit de modifier ou suspendre le programme de parrainage à tout moment. Toute tentative de fraude (création de faux comptes, etc.) entraînera la suspension du compte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Résiliation</h2>
            <p className="text-gray-600 leading-relaxed">
              L&apos;utilisateur peut supprimer son compte à tout moment en contactant le support. L&apos;éditeur se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU. En cas de résiliation, les tokens non utilisés ne seront pas remboursés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Droit applicable et juridiction</h2>
            <p className="text-gray-600 leading-relaxed">
              Les présentes CGU sont soumises au droit français. En cas de litige, les parties s&apos;engagent à rechercher une solution amiable avant toute action judiciaire. À défaut, les tribunaux compétents seront ceux du ressort du siège social de l&apos;éditeur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Modification des CGU</h2>
            <p className="text-gray-600 leading-relaxed">
              L&apos;éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification par email ou notification sur la plateforme. La poursuite de l&apos;utilisation du service après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l&apos;adresse : contact@seora-cv.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
