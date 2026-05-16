"use server";
import { supabase } from '../../lib/supabase';
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

// Initialisation unique du modèle d'embedding (Pattern Singleton) pour éviter les rechargements en mémoire
const getEmbedder = async () => {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
};

/**
 * Exécute une recherche vectorielle sémantique dans Supabase avec filtrage par métadonnées
 * @param query La question textuelle de l'élève
 * @param matchCount Le nombre maximal de chunks à remonter (12 ou 15 préconisé)
 * @param matiereFilter Le libellé exact de la matière détectée, ou null pour une recherche globale
 */
export const searchContext = async (query: string, matchCount: number = 12, matiereFilter: string | null = null) => {
  try {
    const pipe = await getEmbedder();
    
    // Génération du vecteur de la requête élève (Taille attendue : 384 dimensions)
    const output = await pipe(query, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data) as number[];

    // Appel de la fonction stockée (RPC) PostgreSQL de Supabase pour le calcul de similarité cosinus
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.1,        // Seuil à 0.1 pour être tolérant sur les formats listes et tableaux
      match_count: matchCount,     // Limite dynamique gérée depuis l'interface utilisateur
      filter_matiere: matiereFilter // Filtre strict appliqué directement lors de la requête SQL
    });

    if (error) {
      console.error("Erreur Supabase RPC:", error.message);
      return [];
    }

    return documents || [];
  } catch (err) {
    console.error("Erreur lors de la recherche de contexte (RAG):", err);
    return [];
  }
};