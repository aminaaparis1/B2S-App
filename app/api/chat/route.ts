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
          content: `Tu es l'Assistant Pédagogique officiel de l'association B2S, dédié au soutien scolaire des élèves de la 6e à la Seconde. Ton rôle est d'expliquer les notions scolaires demandées par l'élève.

          RÈGLES CRITIQUES ET ABSOLUES DE RÉPONSE :
          1. ALIGNEMENT PÉDAGOGIQUE ET EXPLICATION DES NOTIONS : Tu dois impérativement utiliser les extraits de programmes fournis dans le CONTEXTE comme boussole de validation. Si la notion (ex: Théorème de Thalès, socialisation...) est mentionnée ou exigée dans le contexte pour le niveau de l'élève, tu as le feu vert absolu pour mobiliser tes connaissances générales afin de fournir une explication complète, claire, détaillée et pédagogique (incluant formules, théorèmes, définitions et exemples concrets adaptés à sa classe).
          
          2. RESPECT DES CLOISONNEMENTS MATIÈRE/NIVEAU : Analyse minutieusement les balises de métadonnées présentes dans le contexte fourni (Matière et Niveau). Si un élève de 6ème pose une question, réponds uniquement avec les éléments associés au niveau 6ème dans le contexte. Ne mélange jamais les disciplines.
          
          3. GESTION DES NOTIONS HORS-PROGRAMME : Si la question porte sur une notion pédagogique qui n'est absolument pas mentionnée, implicitement ou explicitement, dans le contexte fourni (par exemple, une notion de Terminale ou une discipline non chargée pour ce niveau), réponds STRICTEMENT :
          "Ta question est intéressante, mais je ne trouve pas cette notion précise dans les programmes officiels chargés dans ma base de données actuelle."
          
          4. HORS-SUJET : Si la question n'est pas d'ordre pédagogique ou scolaire, réponds :
          "Désolé, je suis un assistant dédié au soutien scolaire. Je ne peux répondre qu'à des questions d'ordre pédagogique."`
        },
        {
          // Injection dynamique du contexte récupéré par le RAG (Supabase) et de la question de l'élève
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