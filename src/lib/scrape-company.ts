import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface CompanyInfo {
  name: string;
  description: string;
  sector: string;
  values: string[];
  products: string[];
  culture: string;
  size: string;
  source: string;
}

/**
 * Fetches company website content and extracts relevant info
 */
async function fetchWebContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CVMasterBot/1.0; +https://cvmaster.fr)",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return "";

    const html = await res.text();
    // Extract text content, remove scripts/styles
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.slice(0, 5000); // Limit to 5k chars
  } catch {
    return "";
  }
}

/**
 * Researches a company using web scraping + AI analysis
 */
export async function researchCompany(
  companyName: string,
  companyUrl?: string
): Promise<CompanyInfo> {
  let webContent = "";

  // Try to scrape company website
  if (companyUrl) {
    webContent = await fetchWebContent(companyUrl);

    // Also try /about page
    try {
      const aboutUrl = new URL("/about", companyUrl).href;
      const aboutContent = await fetchWebContent(aboutUrl);
      if (aboutContent) webContent += "\n\n" + aboutContent;
    } catch {
      // ignore
    }

    // Try /a-propos for French sites
    try {
      const aproposUrl = new URL("/a-propos", companyUrl).href;
      const aproposContent = await fetchWebContent(aproposUrl);
      if (aproposContent) webContent += "\n\n" + aproposContent;
    } catch {
      // ignore
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Fais une recherche sur l'entreprise "${companyName}".
${
  webContent
    ? `\nVoici du contenu de leur site web:\n${webContent.slice(0, 3000)}`
    : "\nJe n'ai pas pu accéder à leur site web."
}

Réponds avec un JSON au format:
{
  "name": "${companyName}",
  "description": "<description de l'entreprise en 2-3 phrases>",
  "sector": "<secteur d'activité>",
  "values": ["<valeur 1>", "<valeur 2>", ...],
  "products": ["<produit/service principal 1>", ...],
  "culture": "<description de la culture d'entreprise>",
  "size": "<taille approximative: startup, PME, ETI, grande entreprise>",
  "source": "${companyUrl ? "Site web + connaissances" : "Connaissances générales"}"
}

Utilise tes connaissances sur cette entreprise si elle est connue. Si tu ne la connais pas et que le contenu web est insuffisant, fais de ton mieux avec ce que tu as et indique clairement les incertitudes.`,
    config: {
      maxOutputTokens: 1500,
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  return JSON.parse(text);
}
