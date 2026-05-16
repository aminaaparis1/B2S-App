"use server";
import fs from 'fs';
import path from 'path';
// @ts-ignore
const pdf = require('pdf-parse-fork');
import { supabase } from '../../lib/supabase';
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

// Initialisation unique du modèle d'embedding (Pattern Singleton)
const getEmbedder = async () => {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
};

// Découpage du texte en segments (chunks) avec zone de chevauchement (overlap) pour préserver le contexte inter-chunk
const createChunks = (text: string, chunkSize: number = 1500, overlap: number = 150) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
};

// Vectorisation locale du texte via Xenova transformers
const generateEmbedding = async (text: string) => {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
};

// 💡 ALGORITHME DE SCORING SÉMANTIQUE : Classification stricte par classe (Bannit l'étiquetage global)
const attribuerNiveauStrict = (chunkText: string, fileName: string): { valide: boolean; niveau: string } => {
  const text = chunkText.toLowerCase();
  const name = fileName.toLowerCase();

  // Isolation du niveau Seconde basé sur le nom du fichier ou le contenu explicite
  if (name.includes("seconde") || name.includes("_2de") || text.includes("classe de seconde")) {
    return { valide: true, niveau: "Seconde" };
  }

  // Isolation du niveau 6ème (Cycle 3) avec garde-fou contre l'inclusion accidentelle des niveaux CM1/CM2
  if (name.includes("6e") || name.includes("cycle3") || name.includes("cycle-3")) {
    if ((text.includes("au cm1") || text.includes("au cm2") || text.includes("fin du cm2")) && !text.includes("en 6e") && !text.includes("sixième")) {
      return { valide: false, niveau: "" };
    }
    return { valide: true, niveau: "6ème" };
  }

  // Système de pondération lexicale pour distribuer individuellement les chunks des fichiers transversaux (5e/4e/3e)
  let score5e = 0;
  let score4e = 0;
  let score3e = 0;

  if (text.includes("cinquième") || text.includes("5ème") || text.includes("5e ")) score5e += 4;
  if (text.includes("classe de 5") || text.includes("fin de 5")) score5e += 2;

  if (text.includes("quatrième") || text.includes("4ème") || text.includes("4e ")) score4e += 4;
  if (text.includes("classe de 4") || text.includes("fin de 4")) score4e += 2;

  if (text.includes("troisième") || text.includes("3ème") || text.includes("3e ")) score3e += 4;
  if (text.includes("classe de 3") || text.includes("brevet") || text.includes("dnb") || text.includes("fin de 3")) score3e += 2;

  // Élection du niveau majoritaire ayant la plus forte densité sémantique
  if (score5e > score4e && score5e > score3e) return { valide: true, niveau: "5ème" };
  if (score4e > score5e && score4e > score3e) return { valide: true, niveau: "4ème" };
  if (score3e > score5e && score3e > score4e) return { valide: true, niveau: "3ème" };

  // Stratégie de repli sur métadonnées de fichier en cas d'égalité parfaite ou de préambule général
  if (name.includes("3eme") || name.includes("3e")) return { valide: true, niveau: "3ème" };
  if (name.includes("4eme") || name.includes("4e")) return { valide: true, niveau: "4ème" };
  if (name.includes("5eme") || name.includes("5e")) return { valide: true, niveau: "5ème" };

  return { valide: true, niveau: "Général" };
};

// 💡 CLOISONNEMENT INTERDISCIPLINAIRE : Filtres sémantiques thématiques pour éviter la contamination croisée en BDD
const pageConcerneMatiere = (pageText: string, matiere: string): boolean => {
  const text = pageText.toLowerCase();
  
  switch (matiere) {
    case "Mathématiques":
      if (text.includes("histoire de la terre") || text.includes("matière, movement, énergie")) return false;
      return text.includes("math") || text.includes("nombre") || text.includes("géométrie") || text.includes("calcul");
    case "Français":
      return text.includes("français") && (text.includes("lecture") || text.includes("écriture") || text.includes("littéraire") || text.includes("oral"));
    case "Histoire-Géographie":
      if (text.includes("sciences économiques") || text.includes("sociologie") || text.includes("équation")) return false; 
      return text.includes("histoire") || text.includes("géographie") || text.includes("recul historique");
    case "Sciences de la Vie et de la Terre":
      if (text.includes("physique-chimie") || text.includes("atomes")) return false;
      return text.includes("sciences de la vie") || text.includes("svt") || text.includes("vivant") || text.includes("cellule");
    case "Physique-Chimie":
      if (text.includes("cellule biologique") || text.includes("reproduction humaine")) return false;
      return text.includes("physique") || text.includes("chimie") || text.includes("molécule") || text.includes("transformation");
    case "Sciences Économiques et Sociales":
      if (text.includes("repères géographiques") || text.includes("climatologie")) return false;
      return text.includes("ses") || text.includes("socialisation") || text.includes("richesse") || text.includes("entreprise");
    case "Sciences Numériques et Technologie":
      return text.includes("snt") || text.includes("numériques") || text.includes("données") || text.includes("python");
    case "Anglais (LV1/LV2)":
      return text.includes("anglais") || text.includes("english") || text.includes("cecrl");
    case "Espagnol (LV1/LV2)":
      return text.includes("espagnol") || text.includes("spanish") || text.includes("hispan");
    case "Allemand (LV1/LV2)":
      return text.includes("allemand") || text.includes("deutsch") || text.includes("german");
    default:
      return true;
  }
};

// Orchestration du pipeline de lecture, filtrage, découpage, vectorisation et stockage
export const ingestFolder = async (folderPath: string, matiere: string) => {
  console.log(`🚀 INGESTION SÉLECTIVE ET TRUNCATE-SAFE POUR : ${matiere}`);
  
  const absolutePath = path.resolve(process.cwd(), folderPath);
  if (!fs.existsSync(absolutePath)) {
    console.log("❌ Dossier introuvable:", absolutePath);
    return;
  }

  const files = fs.readdirSync(absolutePath);

  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const filePath = path.join(absolutePath, file);
      const dataBuffer = fs.readFileSync(filePath);
      
      // Extraction des pages du PDF avec injection de balises de fin de page [PAGE_BREAK]
      const data = await pdf(dataBuffer, {
        pagerender: function(pageData: any) {
          return pageData.getTextContent().then(function(textContent: any) {
            return textContent.items.map((item: any) => item.str).join(' ') + " [PAGE_BREAK] ";
          });
        }
      });
      
      const pages = data.text.split(" [PAGE_BREAK] ");
      let totalChunksEnvoyes = 0;

      for (let i = 0; i < pages.length; i++) {
        const rawPageText = pages[i];

        // Étape 1 : Validation de l'étanchéité de la discipline
        if (!pageConcerneMatiere(rawPageText, matiere)) continue;

        const cleanPageText = rawPageText.replace(/\s+/g, ' ').trim();
        if (!cleanPageText) continue;

        // Étape 2 : Segmentation de la page validée en fragments
        const chunks = createChunks(cleanPageText);

        for (const chunk of chunks) {
          // Étape 3 : Classification fine et dynamique au niveau du chunk individuel
          const analyseNiveau = attribuerNiveauStrict(chunk, file);
          if (!analyseNiveau.valide) continue;

          // Étape 4 : Vectorisation contextuelle
          const embedding = await generateEmbedding(chunk);
          
          // Étape 5 : Persistance et indexation vectorielle sous Supabase
          const { error } = await supabase.from('documents_pedagogiques').insert({
            content: chunk,
            embedding: embedding,
            matiere: matiere,
            niveau: analyseNiveau.niveau
          });

          if (error) {
            console.error(`❌ Erreur d'insertion pour le fichier ${file}:`, error.message);
          } else {
            totalChunksEnvoyes++;
          }
        }
      }
      console.log(`✅ Fichier ${file} synchronisé avec succès : ${totalChunksEnvoyes} morceaux individualisés.`);
    }
  }
};