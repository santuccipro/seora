import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { researchCompany } from "@/lib/scrape-company";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { companyName, companyUrl } = await req.json();

    if (!companyName) {
      return NextResponse.json(
        { error: "Nom d'entreprise requis" },
        { status: 400 }
      );
    }

    const info = await researchCompany(companyName, companyUrl);
    return NextResponse.json(info);
  } catch (error) {
    console.error("Company research error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
