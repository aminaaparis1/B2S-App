"use server";
import { supabase } from '../../lib/supabase';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export const searchContext = async (
  query: string,
  matchCount: number = 12,
  matiereFilter: string | null = null
) => {
  try {
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: query,
    });

    const embedding = Array.isArray(result[0])
      ? (result as number[][])[0]
      : (result as number[]);

    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.1,
      match_count: matchCount,
      filter_matiere: matiereFilter,
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