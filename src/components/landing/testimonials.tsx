"use client";

import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Léa M.",
    role: "Étudiante en marketing",
    content: "J'avais envoyé mon CV partout sans réponse. Après les corrections de CV Master, j'ai décroché 3 entretiens en une semaine !",
    rating: 5,
    avatar: "L",
    color: "bg-pink-500",
  },
  {
    name: "Thomas R.",
    role: "Développeur junior",
    content: "Le score m'a ouvert les yeux sur plein de choses que je ne voyais pas. Les corrections sont ultra précises et pertinentes.",
    rating: 5,
    avatar: "T",
    color: "bg-indigo-500",
  },
  {
    name: "Sarah K.",
    role: "En reconversion pro",
    content: "Super rapport qualité-prix. Pour moins de 10 euros j'ai eu un CV professionnel qui m'a permis de changer de carrière.",
    rating: 5,
    avatar: "S",
    color: "bg-cyan-500",
  },
  {
    name: "Maxime D.",
    role: "Jeune diplômé",
    content: "L'analyse ATS c'est un game changer. Mon CV passait pas les filtres automatiques et maintenant ça marche enfin.",
    rating: 5,
    avatar: "M",
    color: "bg-purple-500",
  },
  {
    name: "Julie A.",
    role: "Chef de projet",
    content: "Rapide, efficace, et surtout les conseils sont adaptés au marché français. Pas un truc américain traduit à la va-vite.",
    rating: 5,
    avatar: "J",
    color: "bg-green-500",
  },
  {
    name: "Karim B.",
    role: "Commercial",
    content: "J'ai utilisé les tokens pour corriger mon CV et ma lettre de motivation. Les deux sont maintenant au top. Merci CV Master !",
    rating: 5,
    avatar: "K",
    color: "bg-orange-500",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Ils ont <span className="gradient-text">boosté</span> leur CV
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Plus de 2 800 CVs améliorés ce mois-ci
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
