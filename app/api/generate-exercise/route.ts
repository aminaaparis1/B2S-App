import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { matiere, niveau, chapitre, context } = await req.json();

    const matiereNorm = matiere
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();

    const estAnglais =
      matiereNorm.includes("anglais") ||
      matiereNorm.includes("english");

    const estEspagnol =
      matiereNorm.includes("espagnol") ||
      matiereNorm.includes("espanol") ||
      matiereNorm.includes("spanish");

    const estAllemand =
      matiereNorm.includes("allemand") ||
      matiereNorm.includes("deutsch") ||
      matiereNorm.includes("german");

    let langueCible = "francais";
    let consigneLangueImperative = `
Toutes les questions, options et explications doivent être rédigées en français.
`;

    if (estAnglais) {
      langueCible = "english";
      consigneLangueImperative = `
ABSOLUTE RULE:
All fields ("question", "options", "explication") MUST be written ONLY in English.
No French words allowed anywhere.
If any French word appears → regenerate mentally before answering.
`;
    }

    if (estEspagnol) {
      langueCible = "spanish";
      consigneLangueImperative = `
REGLA ABSOLUTA:
Todos los campos ("question", "options", "explication") deben estar escritos EXCLUSIVAMENTE en español.
Prohibido cualquier palabra en francés o inglés.
`;
    }

    if (estAllemand) {
      langueCible = "german";
      consigneLangueImperative = `
ABSOLUTE RULE:
Alle Felder ("question", "options", "explication") müssen ausschließlich auf Deutsch geschrieben werden.
Kein Französisch erlaubt.
`;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
Tu es un générateur d'exercices d'application officiel.

MISSION:
Créer un QCM de 10 questions EXACTES (ni plus ni moins).

CONSIGNES STRICTES:
- Aucun texte hors JSON.
- Aucun contenu théorique.
- Focus uniquement sur le chapitre: "${chapitre}" (${niveau}).
- Questions applicatives uniquement.

${consigneLangueImperative}

SELF-CHECK OBLIGATOIRE:
Avant de répondre, vérifie que la langue du contenu respecte STRICTEMENT la consigne.

FORMAT JSON STRICT:
{
  "titre": "Évaluation : ${chapitre}",
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "reponseCorrecte": "...",
      "explication": "..."
    }
  ]
}
`
        },
        {
          role: "user",
          content: `
Génère 10 questions d'évaluation sur "${chapitre}" pour ${matiere} (${niveau}).

CONTEXTE:
${context}

IMPORTANT:
- Réponds uniquement en JSON
- Respecte la langue: ${langueCible}
`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Aucun contenu généré par le modèle.");
    }

    let data;
    try {
      data = typeof rawContent === "string"
        ? JSON.parse(rawContent)
        : rawContent;
    } catch (e) {
      console.error("❌ JSON invalide:", rawContent);
      throw new Error("Réponse JSON invalide du modèle");
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Erreur API Exercices:", error);

    return NextResponse.json(
      { error: "Échec de production du QCM" },
      { status: 500 }
    );
  }
}