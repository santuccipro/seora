import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// Articles complets (contenu JSX inline)
const ARTICLES: Record<
  string,
  {
    title: string;
    date: string;
    readTime: string;
    category: string;
    description: string;
    content: React.ReactNode;
  }
> = {
  "humaniser-texte-ia-turnitin": {
    title: "Comment humaniser un texte IA pour passer Turnitin en 2026",
    date: "18 juillet 2026",
    readTime: "8 min",
    category: "Humanisation IA",
    description:
      "Turnitin détecte ton texte ChatGPT ? Méthode complète pour réécrire ton mémoire avec un score inférieur à 20%.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Pourquoi Turnitin détecte les textes générés par IA ?</h2>
        <p>
          Turnitin AI Detection analyse des caractéristiques statistiques
          spécifiques aux modèles de langage : perplexité basse, burstiness
          uniforme (longueur de phrases similaires), distribution de tokens trop
          &quot;propre&quot;. Un humain écrit avec des variantes naturelles — un
          LLM choisit toujours le mot le plus probable.
        </p>
        <p>
          Depuis 2023, Turnitin intègre nativement la détection IA dans sa
          plateforme. Le score est affiché à côté du score de plagiat classique,
          sous la forme d&apos;un pourcentage &quot;AI-generated content&quot;.
        </p>

        <h2>Quel score déclenche une alerte ?</h2>
        <p>
          Turnitin ne définit pas officiellement de seuil. En pratique, les
          retours d&apos;étudiants et d&apos;enseignants montrent que :
        </p>
        <ul>
          <li>Moins de 20% : généralement ignoré ou considéré comme du bruit</li>
          <li>
            20-40% : peut déclencher une vérification manuelle par
            l&apos;enseignant
          </li>
          <li>
            Plus de 40% : souvent signalé comme suspect, voire sanctionné selon
            le règlement de l&apos;établissement
          </li>
        </ul>
        <p>
          Chaque université a sa propre politique — certaines sanctionnent dès
          20%, d&apos;autres utilisent le score uniquement comme indicateur
          non-décisionnel.
        </p>

        <h2>La méthode en 4 étapes</h2>
        <p>
          <strong>Étape 1 — Tester d&apos;abord</strong> : avant de tout
          réécrire, utilise un détecteur IA (Seora, GPTZero) pour identifier les
          sections à risque. Inutile de toucher à ce qui est déjà sous 15%.
        </p>
        <p>
          <strong>Étape 2 — Traiter section par section</strong> : ne colle pas
          ton document entier dans un humaniseur. Traite par blocs de 400-800
          mots pour maintenir la cohérence stylistique.
        </p>
        <p>
          <strong>Étape 3 — Choisir le bon mode</strong> : pour Turnitin, le
          mode &quot;balanced&quot; ou &quot;aggressive&quot; dans Seora suffit
          généralement. Réserve le mode &quot;compilatio-proof&quot; pour
          Compilatio.
        </p>
        <p>
          <strong>Étape 4 — Relire et ajuster</strong> : après humanisation,
          relis chaque section. L&apos;outil peut parfois introduire des
          maladresses — corrige à la main les passages qui sonnent étrange.
        </p>

        <h2>Les sections les plus à risque</h2>
        <p>
          Dans un mémoire ou rapport de stage, les sections généralement
          signalées en priorité :
        </p>
        <ul>
          <li>
            <strong>Introduction et conclusion</strong> : souvent rédigées 100%
            par IA, très uniformes
          </li>
          <li>
            <strong>Revue de littérature / état de l&apos;art</strong> :
            formulations encyclopédiques typiques des LLMs
          </li>
          <li>
            <strong>Transitions entre parties</strong> : &quot;Nous avons vu
            que... Dans cette seconde partie, nous allons...&quot;
          </li>
        </ul>
        <p>
          Les sections avec des données chiffrées, tableaux, analyses originales
          et résultats empiriques sont rarement signalées — elles contiennent des
          informations spécifiques que l&apos;IA ne génère pas de façon homogène.
        </p>

        <h2>Faut-il avoir peur de Turnitin ?</h2>
        <p>
          Le détecteur IA de Turnitin n&apos;est pas infaillible. Des études
          académiques publiées en 2024 montrent des taux de faux positifs
          significatifs, notamment sur des textes écrits par des locuteurs
          non-natifs ou dans des styles très formels. Turnitin lui-même recommande
          de ne pas sanctionner uniquement sur la base du score IA, mais de
          combiner avec une évaluation humaine.
        </p>
        <p>
          Cela dit, dans un contexte universitaire où les enseignants manquent de
          temps, un score élevé peut déclencher une sanction même sans
          vérification approfondie.
        </p>
      </div>
    ),
  },

  "lettre-motivation-ia-tics-chatgpt": {
    title: "Lettre de motivation avec ChatGPT : éviter les tics de langage IA",
    date: "15 juillet 2026",
    readTime: "6 min",
    category: "Lettre de motivation",
    description:
      "Les recruteurs repèrent immédiatement les lettres générées par IA. Voici comment écrire une lettre qui sonne vraiment humaine.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Les tics de langage IA que les recruteurs reconnaissent</h2>
        <p>
          Après des milliers de candidatures, les recruteurs ont développé un
          &quot;flair&quot; pour les lettres générées par IA. Voici les formules
          qui les font lever les yeux au ciel :
        </p>
        <ul>
          <li>&quot;En tant que candidat passionné par...&quot;</li>
          <li>&quot;Mes atouts précieux&quot;</li>
          <li>&quot;Je suis convaincu(e) que mes compétences...&quot;</li>
          <li>&quot;Votre entreprise, reconnue pour son excellence...&quot;</li>
          <li>&quot;Je serais ravi(e) de contribuer à...&quot;</li>
          <li>L&apos;expression &quot;savoir-faire&quot; utilisée 3 fois</li>
          <li>Toute phrase commençant par &quot;En tant que&quot;</li>
        </ul>
        <p>
          Ce ne sont pas des formules mauvaises en soi — c&apos;est leur
          ubiquité qui les trahit. Quand un recruteur voit 50 lettres par jour et
          que 30 contiennent &quot;En tant que candidat passionné&quot;, il sait.
        </p>

        <h2>Pourquoi ChatGPT génère ces formules</h2>
        <p>
          Les LLMs comme ChatGPT sont entraînés sur des millions de lettres de
          motivation &quot;correctes&quot;. Ils optimisent pour produire des
          textes formellement corrects et professionnels — mais ce faisant, ils
          convergent vers les mêmes formules, qui sont statistiquement les plus
          fréquentes dans leurs données d&apos;entraînement.
        </p>
        <p>
          Le résultat est une lettre qui ressemble à toutes les autres lettres
          IA : grammaticalement parfaite, professionnellement correcte, et
          totalement interchangeable.
        </p>

        <h2>La technique des 3 spécificités</h2>
        <p>
          Pour sortir de ce pattern, force-toi à inclure 3 éléments
          ultra-spécifiques dans ta lettre :
        </p>
        <ol>
          <li>
            <strong>Un fait précis sur l&apos;entreprise</strong> : pas &quot;votre
            entreprise est reconnue pour son innovation&quot; mais &quot;j&apos;ai
            vu que vous venez de lancer X sur le marché Y — ça m&apos;a frappé
            parce que...&quot;
          </li>
          <li>
            <strong>Une expérience personnelle concrète</strong> : pas &quot;j&apos;ai
            développé mes compétences en gestion de projet&quot; mais &quot;lors de
            mon stage chez X, j&apos;ai géré un budget de Y€ et fait face à Z
            problème&quot;
          </li>
          <li>
            <strong>Une curiosité ou question</strong> : &quot;Je serais curieux de
            savoir comment vous envisagez X dans les prochains mois&quot; — ça
            montre que tu as réfléchi, pas juste rempli un template
          </li>
        </ol>

        <h2>Comment utiliser l&apos;IA sans tomber dans les tics</h2>
        <p>
          L&apos;IA reste utile pour rédiger une lettre — à condition de la
          prompter correctement :
        </p>
        <ul>
          <li>
            Donne-lui TON expérience spécifique à reformuler, pas juste
            l&apos;offre d&apos;emploi
          </li>
          <li>
            Demande-lui explicitement d&apos;éviter les formules génériques
            (&quot;n&apos;utilise pas En tant que, ni mes atouts, ni
            passionné&quot;)
          </li>
          <li>
            Après génération, passe dans Seora pour détecter et humaniser les
            passages qui sonnent trop IA
          </li>
          <li>
            Ajoute toujours une phrase finale écrite par toi, en ton propre style
          </li>
        </ul>
      </div>
    ),
  },

  "passer-compilatio-memoire-ia": {
    title: "Passer sous Compilatio avec un mémoire partiellement rédigé par IA",
    date: "10 juillet 2026",
    readTime: "7 min",
    category: "Académique",
    description:
      "Compilatio est le détecteur IA phare dans les universités françaises. Stratégie section par section pour y passer.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Compilatio : le standard des universités françaises</h2>
        <p>
          Compilatio est une entreprise française fondée à Grenoble, utilisée par
          la grande majorité des universités publiques en France, en Belgique et
          en Suisse romande. Contrairement à Turnitin (plutôt présent dans les
          écoles de commerce et universités internationales), Compilatio est le
          détecteur que tu es le plus susceptible de croiser si tu es à
          l&apos;université publique française.
        </p>
        <p>
          Depuis sa version Compilatio.net 4.0 lancée en 2023, l&apos;outil
          intègre nativement une détection IA qui analyse le texte au niveau de
          la phrase, pas seulement du document.
        </p>

        <h2>Comment Compilatio détecte l&apos;IA</h2>
        <p>Compilatio utilise un modèle différent de Turnitin. Il analyse notamment :</p>
        <ul>
          <li>
            La cohérence stylistique sur l&apos;ensemble du document (une section
            rédigée par IA dans un document sinon humain ressort clairement)
          </li>
          <li>Les patterns de ponctuation et de structure de paragraphes</li>
          <li>
            La densité d&apos;information par phrase (l&apos;IA tend à
            &quot;compresser&quot; l&apos;info de façon très régulière)
          </li>
          <li>La variété lexicale au niveau du paragraphe</li>
        </ul>

        <h2>La stratégie section par section</h2>
        <p>
          <strong>Analyse d&apos;abord, réécriture ensuite.</strong> Commence par
          coller ton mémoire dans un détecteur (Seora ou GPTZero) pour identifier
          quelles sections passent et lesquelles échouent. Ça t&apos;évite de
          réécrire des parties qui n&apos;en avaient pas besoin.
        </p>
        <p>Pour chaque section signalée :</p>
        <ol>
          <li>
            Passe dans Seora en mode &quot;compilatio-proof&quot; (spécialement
            calibré pour ce détecteur)
          </li>
          <li>Relis la sortie et corrige les maladresses</li>
          <li>Reteste dans le détecteur</li>
          <li>
            Si le score est encore trop élevé : passe une deuxième fois en mode
            &quot;aggressive&quot;
          </li>
        </ol>

        <h2>Cas particulier : la bibliographie et les citations</h2>
        <p>
          Ne touche jamais aux citations, à la bibliographie, aux notes de bas de
          page et aux titres de section. Compilatio les reconnaît et ne les
          analyse pas comme du texte normal. Les humaniser peut paradoxalement
          créer des incohérences stylistiques qui attirent l&apos;attention.
        </p>

        <h2>Combien de temps ça prend ?</h2>
        <p>
          Pour un mémoire de 50 pages traité section par section : compter 1 à 2
          heures. C&apos;est le principal désavantage de l&apos;approche section
          par section vs. l&apos;upload d&apos;un document entier — mais la
          qualité du résultat est incomparable.
        </p>
      </div>
    ),
  },

  "cv-etudiant-decrocher-entretien": {
    title: "CV étudiant en 2026 : ce que les recruteurs regardent en 6 secondes",
    date: "5 juillet 2026",
    readTime: "5 min",
    category: "CV & Candidature",
    description:
      "Un recruteur passe en moyenne 6 secondes sur un CV. Ce qu'il cherche et les erreurs qui font supprimer un CV en stage.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Les 6 secondes : mythe ou réalité ?</h2>
        <p>
          La stat des &quot;6 secondes&quot; vient d&apos;une étude eye-tracking
          de 2012 réalisée par TheLadders. Elle a été souvent citée et extrapolée,
          mais le principe reste valide en 2026 : les recruteurs débordés font un
          premier tri rapide. Si ton CV ne retient pas l&apos;attention en
          quelques secondes, il ne sera pas relu.
        </p>
        <p>Ce que le regard d&apos;un recruteur capture en premier :</p>
        <ol>
          <li>Le titre du poste ou ta formation actuelle</li>
          <li>Le nom des entreprises de tes expériences</li>
          <li>Les dates (durée des expériences)</li>
          <li>Les compétences clés ou outils</li>
        </ol>

        <h2>Les erreurs qui font supprimer un CV de stage</h2>
        <ul>
          <li>
            <strong>Objectif professionnel générique</strong> : &quot;Je recherche
            un poste stimulant dans une entreprise dynamique&quot; — ça dit tout
            et rien
          </li>
          <li>
            <strong>Expériences sans résultats chiffrés</strong> : &quot;J&apos;ai
            participé à des projets&quot; vs &quot;J&apos;ai contribué à un projet
            qui a réduit les délais de 20%&quot;
          </li>
          <li>
            <strong>Compétences vagues</strong> : &quot;Maîtrise de Microsoft
            Office&quot; en 2026 c&apos;est comme mettre &quot;sait utiliser un
            téléphone&quot;
          </li>
          <li>
            <strong>Mise en page trop chargée</strong> : tableaux complexes,
            colonnes déséquilibrées, police illisible en dessous de 10pt
          </li>
          <li>
            <strong>Photo non professionnelle</strong> : ou absence de photo dans
            les secteurs où elle est attendue (France, Allemagne, Suisse)
          </li>
        </ul>

        <h2>Comment l&apos;IA aide à corriger ces erreurs</h2>
        <p>
          Les outils d&apos;analyse de CV comme Seora analysent ton document sur
          6 critères : pertinence des mots-clés par secteur, structure, impact des
          expériences, cohérence des dates, compétences, et forme. Pour chaque
          point faible, tu reçois des corrections personnalisées au lieu de
          conseils génériques.
        </p>
        <p>
          Le gros avantage : tu n&apos;as pas besoin de deviner ce qui cloche.
          L&apos;IA identifie exactement quel bullet point sonne creux et propose
          une réécriture avec des verbes d&apos;action et des métriques.
        </p>
      </div>
    ),
  },

  "alternance-cv-lettre-secteur-finance": {
    title: "Alternance en finance : CV et lettre de motivation qui convertissent en 2026",
    date: "22 juillet 2026",
    readTime: "7 min",
    category: "CV & Candidature",
    description: "CV alternance finance, lettre de motivation banque assurance : ce que les recruteurs BNP, SG, AXA veulent vraiment voir en 2026.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Pourquoi la finance est un secteur à part</h2>
        <p>
          Le secteur financier — banque de détail, banque d&apos;investissement, assurance, gestion
          d&apos;actifs — est l&apos;un des plus compétitifs pour les alternants en France. BNP Paribas,
          Société Générale, AXA, Natixis ou Crédit Agricole reçoivent des milliers de candidatures
          pour chaque vague de recrutement. Le premier filtre est quasi-systématiquement automatisé
          via un ATS.
        </p>
        <p>
          Conséquence directe : ton CV doit passer un robot avant d&apos;arriver devant un humain.
          Et ta lettre doit convaincre en 30 secondes chrono.
        </p>

        <h2>Ce que doit contenir ton CV alternance finance</h2>
        <h3>Les mots-clés incontournables (selon le poste)</h3>
        <ul>
          <li><strong>Contrôle de gestion / finance d&apos;entreprise</strong> : Excel avancé, PowerBI, SAP, analyse de variance, reporting, P&L, EBITDA</li>
          <li><strong>Banque de détail / relation client</strong> : CRM, portefeuille clients, satisfaction client, KYC, conformité, MIF2</li>
          <li><strong>Banque d&apos;investissement / marchés</strong> : Bloomberg, Reuters, VBA, modélisation financière, DCF, LBO, pitch deck</li>
          <li><strong>Assurance</strong> : Solvabilité II, actuariat, sinistralité, courtage, contrats vie/non-vie</li>
        </ul>
        <p>
          Utilise exactement les mots de l&apos;offre d&apos;emploi — les ATS font du matching
          exact. Si l&apos;offre dit &quot;modélisation financière&quot;, ne mets pas
          &quot;analyse financière&quot; — mets les deux.
        </p>

        <h3>La structure qui marche</h3>
        <ol>
          <li><strong>Titre accrocheur</strong> : &quot;Étudiant M2 Finance / Candidat alternance Analyste Financier&quot; — pas juste votre cursus</li>
          <li><strong>Accroche 3 lignes</strong> : ta formation + ta spécialité + ce que tu apportes</li>
          <li><strong>Expériences avec résultats chiffrés</strong> : chaque bullet point doit avoir un verbe d&apos;action + un chiffre</li>
          <li><strong>Compétences techniques</strong> : séparées des soft skills, avec niveau (avancé / intermédiaire)</li>
          <li><strong>Certifications</strong> : Bloomberg Market Concepts, CFA niveau 1, Excel Expert — même en cours, ça compte</li>
        </ol>

        <h2>La lettre de motivation finance : ce qui marche vraiment</h2>
        <p>
          Les recruteurs en finance ne veulent pas lire &quot;Je suis passionné par les marchés
          financiers&quot; — tout le monde écrit ça. Ce qu&apos;ils cherchent :
        </p>
        <ul>
          <li><strong>Une connaissance réelle de l&apos;entreprise</strong> : un fait récent (résultat, acquisition, produit lancé) que tu as vu dans leur rapport annuel ou dans la presse financière</li>
          <li><strong>Une compétence technique prouvée</strong> : &quot;J&apos;ai construit un modèle DCF sous Excel pour évaluer une PME dans le cadre d&apos;un cours de M1&quot; — concret, vérifiable</li>
          <li><strong>Une motivation claire pour CE poste</strong>, pas pour &quot;la finance en général&quot;</li>
        </ul>

        <h3>Structure en 4 paragraphes</h3>
        <ol>
          <li><strong>Accroche</strong> : un fait précis sur l&apos;entreprise + pourquoi tu postules maintenant</li>
          <li><strong>Ce que tu apportes</strong> : ta formation + 1-2 expériences pertinentes avec chiffres</li>
          <li><strong>Ce que tu cherches à apprendre</strong> : montre que tu as réfléchi à ce que le poste t&apos;apportera (et non l&apos;inverse)</li>
          <li><strong>Conclusion</strong> : courte, directe, avec disponibilité et contact</li>
        </ol>

        <h2>Les erreurs qui éliminent d&apos;office</h2>
        <ul>
          <li>Une faute d&apos;orthographe dans le nom de l&apos;entreprise ou du recruteur</li>
          <li>Un CV de 2 pages quand tu n&apos;as pas encore 5 ans d&apos;expérience</li>
          <li>Des compétences Excel &quot;avancé&quot; que tu ne sais pas justifier en entretien</li>
          <li>Une lettre copiée-collée avec juste le nom de l&apos;entreprise changé (les recruteurs s&apos;en aperçoivent)</li>
          <li>Zéro chiffre dans les expériences — &quot;j&apos;ai participé à des analyses&quot; dit rien</li>
        </ul>

        <h2>Utiliser l&apos;IA pour ton CV finance sans se planter</h2>
        <p>
          L&apos;IA peut t&apos;aider à restructurer tes bullet points et à identifier les mots-clés
          manquants. Mais attention : les lettres générées par IA sonnent faux pour des recruteurs
          en finance qui lisent des centaines de lettres. Utilise Seora pour générer une base, puis
          personnalise systématiquement avec des éléments que seul toi peux connaître.
        </p>
        <p>
          L&apos;analyseur ATS de Seora te donne un score par critère et des suggestions précises
          pour augmenter tes chances de passer le premier filtre automatique — utile avant d&apos;envoyer
          une candidature pour un poste en tension.
        </p>
      </div>
    ),
  },

  "rapport-stage-ia-comment-ecrire": {
    title: "Rapport de stage : utiliser l'IA sans se faire prendre en 2026",
    date: "21 juillet 2026",
    readTime: "8 min",
    category: "Académique",
    description: "Comment rédiger un rapport de stage avec l'IA de façon indétectable en 2026 — méthode, outils, erreurs à éviter.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Pourquoi le rapport de stage est un cas particulier</h2>
        <p>
          Le rapport de stage est différent d&apos;un mémoire ou d&apos;une dissertation. Il contient
          des informations que seul toi peux connaître : le contexte de l&apos;entreprise, les missions
          que tu as réalisées, les problèmes que tu as rencontrés, les apprentissages personnels.
          C&apos;est précisément ce qui le rend à la fois plus difficile à écrire — et plus facile
          à défendre face à un détecteur IA, si tu utilises bien l&apos;outil.
        </p>

        <h2>Ce que l&apos;IA peut faire (et ne peut pas faire)</h2>
        <h3>Ce que l&apos;IA fait bien</h3>
        <ul>
          <li>Restructurer une introduction ou une conclusion que tu as écrite en brouillon</li>
          <li>Améliorer la tournure de tes phrases sans changer le fond</li>
          <li>Générer le plan détaillé d&apos;une section à partir de tes notes</li>
          <li>Produire la revue bibliographique / état de l&apos;art sur ton secteur</li>
          <li>Rédiger les parties &quot;présentation de l&apos;entreprise&quot; à partir de données factuelles</li>
        </ul>
        <h3>Ce que l&apos;IA ne peut pas faire à ta place</h3>
        <ul>
          <li>Décrire tes missions spécifiques — elle ne les connaît pas</li>
          <li>Analyser les résultats de ton travail avec tes propres chiffres</li>
          <li>Exprimer ton ressenti, tes apprentissages personnels, les difficultés rencontrées</li>
          <li>Formuler ta conclusion sur &quot;en quoi ce stage m&apos;a apporté&quot;</li>
        </ul>
        <p>
          La règle d&apos;or : l&apos;IA structure, toi tu fournis la matière. Jamais l&apos;inverse.
        </p>

        <h2>La méthode en 5 étapes pour un rapport indétectable</h2>
        <ol>
          <li>
            <strong>Écris d&apos;abord tes notes brutes</strong> : bullet points en vrac, sans chercher à faire joli. Missions faites, problèmes rencontrés, solutions trouvées, chiffres clés. Ces éléments ne peuvent venir que de toi.
          </li>
          <li>
            <strong>Donne tes notes à l&apos;IA pour structurer</strong> : &quot;Voici mes notes sur ma mission principale, transforme-les en 3 paragraphes fluides sans inventer de détails.&quot; L&apos;IA améliore ta forme, pas ton fond.
          </li>
          <li>
            <strong>Laisse l&apos;IA rédiger les parties génériques</strong> : présentation du secteur, état de l&apos;art, bibliographie — ces sections sont moins risquées car elles sont naturellement plus formelles.
          </li>
          <li>
            <strong>Teste le score IA section par section</strong> : utilise Seora ou GPTZero pour identifier les passages à risque avant de rendre. Les sections avec tes données propres auront naturellement un score faible.
          </li>
          <li>
            <strong>Humanise les passages signalés</strong> : pour les sections génériques qui ressortent avec un score élevé, passe dans Seora en mode &quot;balanced&quot; — suffisant pour un rapport de stage.
          </li>
        </ol>

        <h2>Les sections les plus détectées</h2>
        <p>Dans un rapport de stage type, voici ce qui est le plus souvent signalé :</p>
        <ul>
          <li><strong>Introduction et conclusion</strong> : si elles sont 100% générées par IA, elles ont une structure trop lisse</li>
          <li><strong>Présentation de l&apos;entreprise</strong> : si tu as collé le texte du site + demandé à l&apos;IA de reformuler</li>
          <li><strong>État de l&apos;art / revue bibliographique</strong> : style encyclopédique typique des LLMs</li>
        </ul>
        <p>
          Les sections les moins détectées : la description de tes missions (si elle est réelle), les
          tableaux de résultats, les annexes, et la partie &quot;bilan personnel&quot; si elle est
          vraiment personnelle.
        </p>

        <h2>Et si tu passes à l&apos;oral de soutenance ?</h2>
        <p>
          Les enseignants qui soupçonnent l&apos;usage de l&apos;IA posent souvent des questions très
          précises sur des détails du rapport. Si tu n&apos;as pas réellement fait les missions que tu
          décris, ça se voit en 30 secondes. L&apos;IA peut améliorer ton rapport, mais elle ne peut
          pas te préparer à l&apos;oral à ta place — raison de plus pour conserver la matière réelle.
        </p>
      </div>
    ),
  },

  "entretien-embauche-questions-pieges-alternance": {
    title: "Questions pièges en entretien d'alternance : les 10 réponses qui font la différence",
    date: "20 juillet 2026",
    readTime: "9 min",
    category: "Entretien",
    description: "Les 10 questions pièges en entretien d'alternance et les réponses STAR qui convainquent les recruteurs en 2026.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Pourquoi les entretiens d&apos;alternance sont différents</h2>
        <p>
          Un recruteur qui recrute un alternant sait qu&apos;il recrute quelqu&apos;un sans expérience
          complète. Ce qu&apos;il évalue avant tout : ta motivation, ta capacité à apprendre vite,
          et ton adéquation culturelle avec l&apos;équipe. Les questions &quot;pièges&quot; existent
          pour voir comment tu réagis sous pression — pas forcément pour trouver la bonne réponse.
        </p>
        <p>
          La méthode STAR (Situation → Tâche → Action → Résultat) est la plus efficace pour
          structurer tes réponses sans paraître récité.
        </p>

        <h2>Les 10 questions pièges et comment y répondre</h2>

        <h3>1. &quot;Parlez-moi de vous&quot;</h3>
        <p>
          <strong>Le piège</strong> : résumer ton CV de façon mécanique.<br />
          <strong>La bonne réponse</strong> : 60 secondes max. Formation → expérience la plus pertinente →
          ce qui te motive dans CE poste. Termine par une question sur le poste pour montrer ton intérêt.
        </p>

        <h3>2. &quot;Pourquoi vous et pas un autre ?&quot;</h3>
        <p>
          <strong>Le piège</strong> : lister tes qualités génériques (&quot;je suis rigoureux, motivé, curieux&quot;).<br />
          <strong>La bonne réponse</strong> : cite une compétence spécifique + un exemple concret + pourquoi
          ça répond à leur besoin précis. &quot;J&apos;ai déjà géré X dans le cadre de Y, ce qui me permet
          d&apos;être opérationnel sur Z dès le début.&quot;
        </p>

        <h3>3. &quot;Où vous voyez-vous dans 5 ans ?&quot;</h3>
        <p>
          <strong>Le piège</strong> : dire que tu veux rester dans l&apos;entreprise (ça semble calculé)
          ou que tu veux être directeur (ça semble naïf).<br />
          <strong>La bonne réponse</strong> : parler de compétences que tu veux développer, pas d&apos;un
          titre. &quot;Je veux maîtriser X et avoir une vraie expertise en Y — cette alternance est une
          étape clé pour ça.&quot;
        </p>

        <h3>4. &quot;Quels sont vos défauts ?&quot;</h3>
        <p>
          <strong>Le piège</strong> : le classique &quot;je suis trop perfectionniste&quot; — tout le monde
          le dit, ça ne convainc plus.<br />
          <strong>La bonne réponse</strong> : cite un vrai défaut + ce que tu fais concrètement pour le
          corriger. &quot;J&apos;ai tendance à vouloir tout comprendre avant d&apos;agir, ce qui peut
          ralentir le démarrage. J&apos;ai appris à lancer et ajuster en cours de route.&quot;
        </p>

        <h3>5. &quot;Pourquoi cette entreprise et pas nos concurrents ?&quot;</h3>
        <p>
          <strong>Le piège</strong> : &quot;votre réputation&quot; ou &quot;votre taille&quot; — trop vague.<br />
          <strong>La bonne réponse</strong> : un fait précis que tu as trouvé sur eux (initiative récente,
          valeur affichée, projet en cours) + pourquoi ça résonne avec ta trajectoire personnelle.
        </p>

        <h3>6. &quot;Décrivez une situation où vous avez géré un conflit&quot;</h3>
        <p>
          <strong>Le piège</strong> : ne pas avoir d&apos;exemple (ou inventer).<br />
          <strong>La bonne réponse (méthode STAR)</strong> : Situation (contexte du conflit) → Tâche
          (ton rôle) → Action (ce que tu as fait pour résoudre) → Résultat (l&apos;issue concrète).
          Un projet de groupe en école compte.
        </p>

        <h3>7. &quot;Vous avez l&apos;air jeune pour ce poste&quot;</h3>
        <p>
          <strong>Le piège</strong> : se défendre ou s&apos;excuser.<br />
          <strong>La bonne réponse</strong> : &quot;C&apos;est justement l&apos;avantage de l&apos;alternance
          — vous formez quelqu&apos;un à votre façon de faire. Et voici ce que j&apos;apporte déjà...&quot;
          Transforme l&apos;objection en argument.
        </p>

        <h3>8. &quot;Quelles sont vos prétentions salariales ?&quot;</h3>
        <p>
          <strong>Le piège</strong> : ne pas savoir répondre ou donner un chiffre sans contexte.<br />
          <strong>La bonne réponse</strong> : pour une alternance, le salaire est légalement encadré par
          la grille SMIC. Montre que tu le sais, et demande plutôt les avantages (tickets restaurant,
          télétravail, prime, etc.) — ça montre ta maturité.
        </p>

        <h3>9. &quot;Avez-vous des questions ?&quot;</h3>
        <p>
          <strong>Le piège</strong> : &quot;Non, tout était très clair.&quot; — tu perds une occasion de
          montrer ton intérêt.<br />
          <strong>La bonne réponse</strong> : prépare 3 questions à l&apos;avance. Sur l&apos;équipe,
          sur ce qui fait réussir ou échouer les alternants dans ce poste, sur les projets en cours.
          Évite les questions sur le salaire ou les congés à ce stade.
        </p>

        <h3>10. &quot;Comment vous gérez la pression ?&quot;</h3>
        <p>
          <strong>Le piège</strong> : &quot;très bien&quot; sans exemple.<br />
          <strong>La bonne réponse</strong> : donne un exemple de situation stressante réelle (deadline
          courte, projet qui déraille, examen difficile) + la méthode que tu as utilisée pour t&apos;en
          sortir + le résultat. Conclue par ce que tu as appris de cette expérience.
        </p>

        <h2>Comment se préparer concrètement</h2>
        <p>
          Seora propose un module de préparation entretien : colle l&apos;offre d&apos;emploi, et l&apos;outil
          génère 8 questions spécifiques à ce poste avec des exemples de réponses STAR calibrées sur ton
          profil. Utile pour simuler un entretien avant le jour J.
        </p>
      </div>
    ),
  },

  "cv-competences-ia-ats-2026": {
    title: "CV et ATS en 2026 : les compétences IA qui font passer les filtres",
    date: "19 juillet 2026",
    readTime: "6 min",
    category: "CV & Candidature",
    description: "70% des CV éliminés par ATS avant d'arriver chez un recruteur. Mots-clés, compétences IA, format — comment optimiser son CV ATS en 2026.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>Qu&apos;est-ce qu&apos;un ATS et pourquoi ça compte</h2>
        <p>
          Un ATS (Applicant Tracking System) est un logiciel de gestion des candidatures utilisé par
          la quasi-totalité des grandes entreprises et cabinets de recrutement. Il lit ton CV
          automatiquement et lui attribue un score de pertinence avant même qu&apos;un humain ne le voie.
        </p>
        <p>
          Les ATS les plus utilisés en France : Workday, Taleo, SAP SuccessFactors, SmartRecruiters,
          Greenhouse, Lever. Chacun a ses propres algorithmes, mais les principes de base sont les mêmes.
        </p>

        <h2>Comment un ATS évalue un CV</h2>
        <ul>
          <li><strong>Matching de mots-clés</strong> : l&apos;ATS compare les termes de l&apos;offre avec ceux de ton CV — correspondances exactes et sémantiques</li>
          <li><strong>Parsing de structure</strong> : il doit pouvoir lire tes expériences, dates, titres de poste et compétences — les mises en page trop complexes le font rater des infos</li>
          <li><strong>Score de pertinence</strong> : calculé sur le matching global, les intitulés de poste, les formations et les compétences techniques</li>
        </ul>

        <h2>Les compétences IA à mettre en avant en 2026</h2>
        <p>
          En 2026, les recruteurs cherchent des candidats capables d&apos;utiliser l&apos;IA comme levier
          de productivité. Voici les compétences qui ressortent dans les offres d&apos;emploi par secteur :
        </p>

        <h3>Tous secteurs</h3>
        <ul>
          <li>Prompt engineering (ChatGPT, Claude, Gemini)</li>
          <li>Utilisation d&apos;outils de génération de contenu IA</li>
          <li>Automatisation de tâches répétitives (Zapier, Make, n8n)</li>
          <li>Analyse de données avec assistance IA (Copilot Excel, Gemini Sheets)</li>
        </ul>

        <h3>Finance / Conseil</h3>
        <ul>
          <li>Modélisation financière assistée par IA</li>
          <li>Analyse de rapports avec LLMs (Bloomberg AI, FactSet)</li>
          <li>Power BI / Tableau avec connecteurs IA</li>
        </ul>

        <h3>Marketing / Communication</h3>
        <ul>
          <li>Génération et optimisation de contenus IA (Jasper, Copy.ai, Seora)</li>
          <li>SEO assisté par IA</li>
          <li>A/B testing automatisé</li>
        </ul>

        <h3>Tech / Data</h3>
        <ul>
          <li>Fine-tuning de modèles (HuggingFace)</li>
          <li>RAG et LangChain</li>
          <li>GitHub Copilot / Cursor</li>
          <li>MLOps (déploiement de modèles)</li>
        </ul>

        <h2>Optimiser ton CV pour les ATS : les règles concrètes</h2>
        <ol>
          <li>
            <strong>Copie les mots de l&apos;offre</strong> : si l&apos;offre dit &quot;gestion de projet
            Agile&quot;, mets exactement ces mots — pas &quot;méthodes agiles&quot; ou &quot;Scrum&quot; seul.
            Mets les deux.
          </li>
          <li>
            <strong>Format simple</strong> : une seule colonne, pas de tableaux, pas de zones de texte,
            pas d&apos;images. PDF ou .docx standard — jamais de PDF scanné.
          </li>
          <li>
            <strong>Titres de section standards</strong> : &quot;Expériences professionnelles&quot;,
            &quot;Formation&quot;, &quot;Compétences&quot; — les ATS reconnaissent ces intitulés.
          </li>
          <li>
            <strong>Dates explicites</strong> : MM/AAAA pour chaque expérience — les ATS en ont besoin
            pour calculer l&apos;ancienneté.
          </li>
          <li>
            <strong>Section compétences séparée</strong> : une liste de mots-clés (outils, langages,
            certifications) facilement parsable — pas noyée dans le texte des expériences.
          </li>
        </ol>

        <h2>Comment Seora t&apos;aide à optimiser ton CV pour les ATS</h2>
        <p>
          L&apos;analyseur ATS de Seora scanne ton CV et te donne un score sur 6 critères : densité
          de mots-clés, clarté de structure, impact des expériences (présence de verbes d&apos;action
          et de chiffres), cohérence des dates, pertinence des compétences et lisibilité globale.
        </p>
        <p>
          Pour chaque point faible, tu reçois des corrections concrètes avec des exemples de reformulation.
          En moyenne, les CVs analysés passent de 55% à 78% de score ATS après optimisation — ce qui
          fait souvent la différence entre être éliminé au premier filtre ou passer en entretien.
        </p>
      </div>
    ),
  },

  "detection-ia-universites-france-2026": {
    title: "Détection IA dans les universités françaises : ce qu'on sait en 2026",
    date: "1 juillet 2026",
    readTime: "9 min",
    category: "Actualité",
    description:
      "Quelles universités utilisent Turnitin ? Compilatio ? Quel score déclenche une sanction ? Tour d'horizon 2026.",
    content: (
      <div className="prose prose-gray max-w-none">
        <h2>L&apos;état des lieux en 2026</h2>
        <p>
          En 2026, la quasi-totalité des établissements d&apos;enseignement
          supérieur français ont mis en place une forme de détection IA dans leurs
          processus d&apos;évaluation. Mais les pratiques varient énormément
          d&apos;un établissement à l&apos;autre — et même d&apos;un département à
          l&apos;autre au sein d&apos;une même université.
        </p>

        <h2>Qui utilise quoi ?</h2>
        <p>
          <strong>Compilatio</strong> est de loin le plus répandu dans les
          universités publiques françaises (Paris-Sorbonne, Paris Nanterre, Lyon
          2, Bordeaux, Strasbourg, etc.). C&apos;est un outil d&apos;origine
          française, développé à Grenoble, historiquement utilisé pour le plagiat
          et qui a intégré la détection IA en 2023.
        </p>
        <p>
          <strong>Turnitin</strong> est plus présent dans les grandes écoles de
          commerce (HEC, ESSEC, ESCP, EM Lyon, KEDGE), les écoles
          d&apos;ingénieurs internationalisées et les universités à fort effectif
          d&apos;étudiants étrangers. Turnitin est américain et son pricing est
          plus élevé, ce qui explique sa moindre adoption dans les universités
          publiques françaises aux budgets contraints.
        </p>
        <p>
          <strong>GPTZero et autres</strong> sont parfois utilisés manuellement
          par des enseignants individuels, rarement à l&apos;échelle
          institutionnelle.
        </p>

        <h2>Quel seuil déclenche une sanction ?</h2>
        <p>Il n&apos;y a pas de standard national. Ce que l&apos;on observe en pratique :</p>
        <ul>
          <li>
            La plupart des établissements ne sanctionnent pas automatiquement sur
            la base du score IA — ils demandent une vérification humaine
          </li>
          <li>Un score supérieur à 40-50% est généralement considéré comme un signal fort</li>
          <li>
            Certains enseignants utilisent le score comme prétexte pour un oral de
            vérification supplémentaire
          </li>
          <li>
            La sanction effective dépend du règlement intérieur de
            l&apos;établissement et peut aller de 0 (avertissement) à
            l&apos;annulation de la note
          </li>
        </ul>

        <h2>Ce que les détecteurs ratent</h2>
        <p>
          Aucun détecteur IA n&apos;est infaillible. Des études publiées dans des
          revues académiques en 2024-2025 montrent des taux de faux positifs de 5
          à 15% selon les populations testées. Les textes écrits par des locuteurs
          non-natifs, les styles très formels ou les sujets techniques
          (mathématiques, droit, médecine) sont les plus susceptibles
          d&apos;être incorrectement signalés.
        </p>
        <p>
          Turnitin reconnaît lui-même ces limites dans sa documentation officielle
          et recommande de ne pas prendre de décision disciplinaire sur la seule
          base du score IA.
        </p>

        <h2>Comment se préparer ?</h2>
        <p>
          Avant de rendre un document important (mémoire, rapport de stage,
          dissertation), tester systématiquement avec un détecteur IA. Si le score
          est élevé sur certaines sections, utiliser un humaniseur (Seora) pour
          réécrire les passages à risque — section par section, pas en bloc.
        </p>
      </div>
    ),
  },
};

export async function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) notFound();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.date,
    description: article.description,
    publisher: {
      "@type": "Organization",
      name: "Seora",
      url: "https://tryseora.com",
    },
  };

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="text-indigo-600 font-bold text-lg">
          Seora
        </Link>
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900">
          ← Blog
        </Link>
      </header>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            {article.category}
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2 mb-3 leading-tight">
            {article.title}
          </h1>
          <p className="text-gray-400 text-sm">
            {article.date} · {article.readTime} de lecture
          </p>
        </div>

        {article.content}

        <div className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Essaie Seora gratuitement
          </h2>
          <p className="text-gray-500 mb-4 text-sm">
            150 tokens offerts à l&apos;inscription — humaniseur, détecteur IA,
            analyse CV, lettre de motivation.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </div>
    </main>
  );
}
