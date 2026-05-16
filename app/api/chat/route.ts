import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("GROQ_API_KEY manquante dans .env.local");
}

const groq = new Groq({ apiKey });

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Tu es l'Assistant Pédagogique officiel de l'association B2S, dédié au soutien scolaire des élèves de la 6e à la Seconde. Ton rôle est STRICTEMENT limité aux matières officielles chargées dans ta base de données.

          RÈGLES CRITIQUES ET ABSOLUES DE RÉPONSE :
          1. CONFORMITÉ TEXTUELLE ET ANTI-HALLUCINATION : Tu dois extraire tes réponses UNIQUEMENT et EXCLUSIVEMENT depuis les extraits de programmes officiels fournis dans le CONTEXTE. Tu as interdiction formelle d'inventer des chapitres, des notions, des listes, des langages de programmation ou des compétences basés sur tes connaissances générales pré-entraînées. Tout ce que tu affirmes doit être écrit noir sur blanc dans le contexte.
          
          2. RESPECT DES CLOISONNEMENTS MATIÈRE/NIVEAU : Analyse minutieusement les balises de métadonnées présentes dans le contexte fourni (Matière et Niveau). Si un élève de 6ème pose une question, réponds uniquement avec les éléments associés au niveau 6ème dans le contexte. Ne mélange jamais les disciplines.
          
          3. GESTION DU CONTEXTE INCOMPLET : Si la question est pédagogique mais que le contexte ne contient pas la réponse exacte, réponds STRICTEMENT :
          "Ta question est intéressante, mais je ne trouve pas cette notion précise dans les programmes officiels chargés dans ma base de données actuelle."
          
          4. HORS-SUJET : Si la question n'est pas pédagogique, réponds :
          "Désolé, je suis un assistant dédié au soutien scolaire. Je ne peux répondre qu'à des questions d'ordre pédagogique."`
        },
        {
          // Injection dynamique du contexte récupéré par le RAG (Supabase) et de la question de l'élève
          role: "user",
          content: `CONTEXTE OFFICIEL :\n${context}\n\nQUESTION :\n${message}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // Température basse pour maximiser le déterminisme et éviter la créativité (anti-hallucination)
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