import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Nom", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email) return null;

          let user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                name: credentials.name || credentials.email.split("@")[0],
                tokens: 150,
              },
            });
            // Send welcome email (fire-and-forget)
            if (process.env.RESEND_API_KEY) {
              const welcomeEmail = user.email!;
              const welcomeName = user.name ?? welcomeEmail.split("@")[0];
              const { Resend } = await import("resend");
              const resend = new Resend(process.env.RESEND_API_KEY);
              await resend.emails.send({
                from: process.env.EMAIL_FROM ?? "Seora <noreply@tryseora.com>",
                to: [welcomeEmail],
                subject: "Bienvenue sur Seora 🎉",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #6366f1;">Bienvenue sur Seora, ${welcomeName} !</h1>
                    <p>Tu viens de rejoindre la plateforme qui va transformer ta recherche de stage, d'alternance ou d'emploi.</p>
                    <h2 style="color: #374151;">Ce que tu peux faire maintenant :</h2>
                    <ul style="line-height: 2;">
                      <li>🎯 <strong>Analyser ton CV</strong> — score ATS + corrections personnalisées</li>
                      <li>📝 <strong>Créer ton CV</strong> — 30 templates sectoriels, wizard guidé</li>
                      <li>✉️ <strong>Générer ta lettre</strong> — adaptée à l'offre en 60 secondes</li>
                      <li>💼 <strong>Optimiser ton LinkedIn</strong> — score + titre et résumé réécrits</li>
                      <li>🤫 <strong>Humaniser tes textes</strong> — passe Turnitin et Compilatio</li>
                    </ul>
                    <p>Tu as <strong>150 tokens offerts</strong> pour démarrer.</p>
                    <a href="https://tryseora.com/app" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #06b6d4); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Accéder à mon espace →</a>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Seora — tryseora.com</p>
                  </div>
                `,
              }).catch(() => {}); // fire-and-forget, ne pas bloquer l'auth si Resend fail
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("[AUTH] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || undefined,
              tokens: 150,
            },
          });
          // Send welcome email (fire-and-forget)
          if (process.env.RESEND_API_KEY) {
            const welcomeEmail = user.email!;
            const welcomeName = user.name ?? welcomeEmail.split("@")[0];
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: process.env.EMAIL_FROM ?? "Seora <noreply@tryseora.com>",
              to: [welcomeEmail],
              subject: "Bienvenue sur Seora 🎉",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #6366f1;">Bienvenue sur Seora, ${welcomeName} !</h1>
                  <p>Tu viens de rejoindre la plateforme qui va transformer ta recherche de stage, d'alternance ou d'emploi.</p>
                  <h2 style="color: #374151;">Ce que tu peux faire maintenant :</h2>
                  <ul style="line-height: 2;">
                    <li>🎯 <strong>Analyser ton CV</strong> — score ATS + corrections personnalisées</li>
                    <li>📝 <strong>Créer ton CV</strong> — 30 templates sectoriels, wizard guidé</li>
                    <li>✉️ <strong>Générer ta lettre</strong> — adaptée à l'offre en 60 secondes</li>
                    <li>💼 <strong>Optimiser ton LinkedIn</strong> — score + titre et résumé réécrits</li>
                    <li>🤫 <strong>Humaniser tes textes</strong> — passe Turnitin et Compilatio</li>
                  </ul>
                  <p>Tu as <strong>150 tokens offerts</strong> pour démarrer.</p>
                  <a href="https://tryseora.com/app" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #06b6d4); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Accéder à mon espace →</a>
                  <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Seora — tryseora.com</p>
                </div>
              `,
            }).catch(() => {}); // fire-and-forget, ne pas bloquer l'auth si Resend fail
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  debug: process.env.NODE_ENV === "development",
};
