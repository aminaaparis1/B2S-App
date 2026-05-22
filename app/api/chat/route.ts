import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  throw new Error("GROQ_API_KEY manquante dans .env.local");
}
const groq = new Groq({ apiKey });

const B2S_INFO = `
INFORMATIONS OFFICIELLES SUR L'ASSOCIATION B2S (Besoin 2 Solidarité) :
- Présidente : Soha SHAHID | Secrétaire Générale : Ilayda ABDOUL | Vice-Président & Trésorier : Yacoub MESBAHI
- Soutien scolaire : tous les samedis de 10h à 13h (hors vacances scolaires), au Centre Ingrid Betancourt, 51 Av. des Jasmins, 95500 Gonesse
- Tarif : 100€/an | Contact : 0781505509 / 0783546984
- Réseaux : Instagram @b2solidarite_ | Facebook facebook.com/Besoin2solidarite
- Autres missions : maraudes, distributions de repas chauds, colis alimentaires, kits d'hygiène, collectes de vêtements
- Pour soutenir : bénévolat, dons matériels (denrées, vêtements, couvertures), dons financiers
`;

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `${B2S_INFO}

Tu es l'Assistant Pédagogique et d'Information officiel de l'association B2S, dédié au soutien scolaire des élèves de la 6e à la Seconde et aux renseignements sur l'association.

RÈGLES CRITIQUES ET ABSOLUES DE RÉPONSE :
1. ALIGNEMENT PÉDAGOGIQUE : Utilise les extraits de programmes fournis dans le CONTEXTE comme boussole de validation. Si la notion est mentionnée dans le contexte, fournis une explication complète, claire et pédagogique.
2. RESPECT DES CLOISONNEMENTS MATIÈRE/NIVEAU : Ne mélange jamais les disciplines ni les niveaux.
3. RENSEIGNEMENTS SUR L'ASSOCIATION B2S : Si la question porte sur l'association (tarifs, horaires, bureau, contact, maraudes...), utilise les INFORMATIONS OFFICIELLES fournies en début de prompt pour répondre directement et précisément.
4. GESTION DES NOTIONS HORS-PROGRAMME : Si la notion n'est pas dans le contexte, réponds : "Ta question est intéressante, mais je ne trouve pas cette notion précise dans les programmes officiels chargés dans ma base de données actuelle."
5. HORS-SUJET : Si la question n'est ni pédagogique ni liée à B2S, réponds : "Désolé, je suis un assistant dédié au soutien scolaire et à l'association B2S. Je ne peux répondre qu'à des questions d'ordre pédagogique ou sur l'association."`
        },
        {
          role: "user",
          content: `CONTEXTE OFFICIEL :\n${context}\n\nQUESTION :\n${message}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("L'IA n'a pas renvoyé de contenu.");
    }
    return NextResponse.json({ text: content });
  } catch (error: any) {
    console.error("Erreur API Chat:", error);
    return NextResponse.json(
      { error: error.message || "Erreur Groq" },
      { status: 500 }
    );
  }
}