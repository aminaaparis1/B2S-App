"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";
import {
    format, addDays, addWeeks, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameDay, isSameMonth,
    isWithinInterval, parseISO, addMonths, subMonths
} from "date-fns";
import { fr } from "date-fns/locale";
import {
    ChevronLeft, ChevronRight, X, Plus, Clock,
    BookOpen, Megaphone, Trash2, Ban, ClipboardList, ArrowLeft
} from "lucide-react";

// ─── CONFIGURATION ────────────────────────────────────────────────
const PREMIER_SAMEDI_GROUPE_A = new Date("2026-03-07");
const DEBUT_ANNEE = new Date("2025-09-06");
const FIN_ANNEE = new Date("2026-07-03");

const VACANCES: { debut: string; fin: string }[] = [
    { debut: "2025-10-18", fin: "2025-11-03" },
    { debut: "2025-12-20", fin: "2026-01-05" },
    { debut: "2026-02-14", fin: "2026-03-02" },
    { debut: "2026-04-18", fin: "2026-05-04" },
    { debut: "2026-07-04", fin: "2026-08-31" },
];
// ─────────────────────────────────────────────────────────────────

function estEnVacances(date: Date) {
    return VACANCES.some((v) =>
        isWithinInterval(date, { start: parseISO(v.debut), end: parseISO(v.fin) })
    );
}

function getSamedisEleve(): Date[] {
    const samedis: Date[] = [];
    let current = new Date(DEBUT_ANNEE);
    while (current.getDay() !== 6) current = addDays(current, 1);
    while (current <= FIN_ANNEE) {
        if (!estEnVacances(current)) samedis.push(new Date(current));
        current = addDays(current, 7);
    }
    return samedis;
}

function getSamedisBenevole(groupe: "A" | "B"): Date[] {
    const samedis: Date[] = [];
    let current =
        groupe === "A"
            ? new Date(PREMIER_SAMEDI_GROUPE_A)
            : addWeeks(PREMIER_SAMEDI_GROUPE_A, 1);
    while (current <= FIN_ANNEE) {
        if (current >= DEBUT_ANNEE && !estEnVacances(current))
            samedis.push(new Date(current));
        current = addWeeks(current, 2);
    }
    return samedis;
}

export default function CalendrierPage() {
    const [role, setRole] = useState<string | null>(null);
    const [groupe, setGroupe] = useState<"A" | "B" | null>(null);
    const [samedisValides, setSamedisValides] = useState<Date[]>([]);
    const [seances, setSeances] = useState<any[]>([]);
    const [annonces, setAnnonces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const [moisActuel, setMoisActuel] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [seancesDuJour, setSeancesDuJour] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formTitre, setFormTitre] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formHeureDebut, setFormHeureDebut] = useState("09:00");
    const [formHeureFin, setFormHeureFin] = useState("11:00");
    const [saving, setSaving] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // États pour les devoirs
    const [showDevoirs, setShowDevoirs] = useState(false);
    const [elevesAvecDevoirs, setElevesAvecDevoirs] = useState<any[]>([]);
    const [loadingDevoirs, setLoadingDevoirs] = useState(false);
    const [eleveSelectionne, setEleveSelectionne] = useState<any | null>(null);

    const [showAnnonceForm, setShowAnnonceForm] = useState(false);
    const [newTitre, setNewTitre] = useState("");
    const [newContenu, setNewContenu] = useState("");
    const [posting, setPosting] = useState(false);

    const [annonceSelectionnee, setAnnonceSelectionnee] = useState<any | null>(null);

    const router = useRouter();
    const isStaff = role === "Benevole" || role === "Admin";

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data: profile } = await supabase
                .from("profiles").select("role").eq("id", user.id).single();
            const userRole = profile?.role || "Eleve";
            setRole(userRole);

            if (userRole === "Benevole" || userRole === "Admin") {
                const { data: benevole } = await supabase
                    .from("benevoles").select("groupe").eq("id", user.id).maybeSingle();
                const g = benevole?.groupe as "A" | "B" | null;
                setGroupe(g);
                setSamedisValides(g ? getSamedisBenevole(g) : getSamedisEleve());
            } else {
                setSamedisValides(getSamedisEleve());
            }

            const { data: seancesData } = await supabase
                .from("seances").select("*").order("date_debut", { ascending: true });
            setSeances(seancesData || []);

            const { data: annoncesData } = await supabase
                .from("annonces").select("*, profiles(prenom, nom)")
                .order("created_at", { ascending: false });
            setAnnonces(annoncesData || []);

            setLoading(false);
        }
        init();
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────
    const estSamediValide = (date: Date) =>
        samedisValides.some((s) => isSameDay(s, date));

    const seancesPourDate = (date: Date) =>
        seances.filter((s) => isSameDay(new Date(s.date_debut), date));

    const seancesActives = (date: Date) =>
        seancesPourDate(date).filter((s) => !s.annulee);

    const estAnnulee = (date: Date) => {
        const toutes = seancesPourDate(date);
        return toutes.length > 0 && toutes.every((s) => s.annulee);
    };

    const aSeanceOuValide = (date: Date) =>
        estSamediValide(date) || seancesActives(date).length > 0;

    const getCasesCalendrier = () => {
        const debut = startOfWeek(startOfMonth(moisActuel), { weekStartsOn: 1 });
        const fin = endOfWeek(endOfMonth(moisActuel), { weekStartsOn: 1 });
        const cases: Date[] = [];
        let current = debut;
        while (current <= fin) {
            cases.push(new Date(current));
            current = addDays(current, 1);
        }
        return cases;
    };

    // ── Clic sur un jour ─────────────────────────────────────────────
    const handleClickDate = (date: Date) => {
        setSelectedDate(date);
        setSeancesDuJour(seancesPourDate(date));
        setShowForm(false);
        setShowDevoirs(false);
        setEleveSelectionne(null);
        setElevesAvecDevoirs([]);
        setFormTitre(""); setFormDescription("");
        setFormHeureDebut("09:00"); setFormHeureFin("11:00");
        setShowModal(true);
    };

    // ── Charger les devoirs pour la semaine suivant un samedi ────────
    const chargerDevoirs = async (samedi: Date) => {
        setLoadingDevoirs(true);
        setShowDevoirs(true);
        setEleveSelectionne(null);

        // Du dimanche au vendredi suivant le samedi cliqué
        const debut = format(addDays(samedi, 1), "yyyy-MM-dd");
        const fin = format(addDays(samedi, 6), "yyyy-MM-dd");

        const { data, error } = await supabase
            .from("devoirs")
            .select(`
        id, titre, matiere, date, statut,
        eleve_id,
        eleves (
          id,
          profiles (
            id, prenom, nom, avatar_key, avatar_seed
          )
        )
      `)
            .eq("statut", "a_faire")
            .gte("date", debut)
            .lte("date", fin);

        if (!error && data) {
            // Dédoublonner par élève
            const elevesMap = new Map();
            data.forEach((devoir: any) => {
                const eleve = devoir.eleves;
                if (!eleve) return;
                const id = eleve.id;
                if (!elevesMap.has(id)) {
                    elevesMap.set(id, {
                        ...eleve,
                        devoirs: [],
                    });
                }
                elevesMap.get(id).devoirs.push({
                    id: devoir.id,
                    titre: devoir.titre,
                    matiere: devoir.matiere,
                    date: devoir.date,
                });
            });
            setElevesAvecDevoirs(Array.from(elevesMap.values()));
        }
        setLoadingDevoirs(false);
    };

    // ── Créer une séance ─────────────────────────────────────────────
    const handleSaveSeance = async () => {
        if (!selectedDate || !formTitre.trim()) return;
        setSaving(true);
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const dateDebut = new Date(`${dateStr}T${formHeureDebut}:00`).toISOString();
        const dateFin = new Date(`${dateStr}T${formHeureFin}:00`).toISOString();

        const { data, error } = await supabase.from("seances").insert({
            titre: formTitre,
            description: formDescription,
            date_debut: dateDebut,
            date_fin: dateFin,
            annulee: false,
        }).select().single();

        if (!error && data) {
            const updated = [...seances, data];
            setSeances(updated);
            setSeancesDuJour(updated.filter((s) => isSameDay(new Date(s.date_debut), selectedDate)));
            setShowForm(false);
            setFormTitre(""); setFormDescription("");
        }
        setSaving(false);
    };

    // ── Annuler une séance ───────────────────────────────────────────
    const handleAnnulerSeance = async () => {
        if (!selectedDate) return;
        setCancelling(true);

        const seancesDuJourActuelles = seancesPourDate(selectedDate);

        if (seancesDuJourActuelles.length === 0) {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const dateDebut = new Date(`${dateStr}T09:00:00`).toISOString();
            const dateFin = new Date(`${dateStr}T11:00:00`).toISOString();

            const { data, error } = await supabase.from("seances").insert({
                titre: "Séance annulée",
                date_debut: dateDebut,
                date_fin: dateFin,
                annulee: true,
            }).select().single();

            if (!error && data) {
                const updated = [...seances, data];
                setSeances(updated);
                setSeancesDuJour(updated.filter((s) => isSameDay(new Date(s.date_debut), selectedDate)));
            }
        } else {
            const ids = seancesDuJourActuelles.map((s) => s.id);
            await supabase.from("seances").update({ annulee: true }).in("id", ids);
            const updated = seances.map((s) =>
                ids.includes(s.id) ? { ...s, annulee: true } : s
            );
            setSeances(updated);
            setSeancesDuJour(updated.filter((s) => isSameDay(new Date(s.date_debut), selectedDate)));
        }

        setCancelling(false);
    };

    // ── Rétablir une séance ──────────────────────────────────────────
    const handleRetablirSeance = async () => {
        if (!selectedDate) return;
        const ids = seancesDuJour.map((s) => s.id);
        await supabase.from("seances").update({ annulee: false }).in("id", ids);
        const updated = seances.map((s) =>
            ids.includes(s.id) ? { ...s, annulee: false } : s
        );
        setSeances(updated);
        setSeancesDuJour(updated.filter((s) => isSameDay(new Date(s.date_debut), selectedDate)));
    };

    // ── Supprimer une séance ─────────────────────────────────────────
    const handleDeleteSeance = async (id: string) => {
        await supabase.from("seances").delete().eq("id", id);
        const updated = seances.filter((s) => s.id !== id);
        setSeances(updated);
        if (selectedDate)
            setSeancesDuJour(updated.filter((s) => isSameDay(new Date(s.date_debut), selectedDate)));
    };

    // ── Annonces ─────────────────────────────────────────────────────
    const handlePostAnnonce = async () => {
        if (!newTitre.trim() || !newContenu.trim()) return;
        setPosting(true);
        const { data, error } = await supabase.from("annonces").insert({
            titre: newTitre, contenu: newContenu, auteur_id: userId,
        }).select("*, profiles(prenom, nom)").single();
        if (!error && data) {
            setAnnonces([data, ...annonces]);
            setNewTitre(""); setNewContenu("");
            setShowAnnonceForm(false);
        }
        setPosting(false);
    };

    const handleDeleteAnnonce = async (id: string) => {
        await supabase.from("annonces").delete().eq("id", id);
        setAnnonces(annonces.filter((a) => a.id !== id));
    };

    // ── Données dérivées ─────────────────────────────────────────────
    const today = new Date();
    const prochains = samedisValides
        .filter((d) => d >= today && !estAnnulee(d))
        .slice(0, 3);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-[#76D7B1] border-t-transparent animate-spin" />
            </div>
        );
    }

    const cases = getCasesCalendrier();
    const jours = ["L", "M", "M", "J", "V", "S", "D"];

    return (
        <div className="min-h-screen bg-white pb-32 max-w-md mx-auto font-sans">

            {/* Header */}
            <div className="px-6 pt-8 pb-2">
                <h1 className="text-3xl font-black text-gray-900">Calendrier</h1>
                <p className="text-gray-400 text-sm mt-1 font-medium">
                    {isStaff
                        ? groupe ? `Groupe ${groupe} · 1 samedi sur 2` : "Groupe non défini"
                        : "Tous les samedis hors vacances"}
                </p>
            </div>

            {/* Calendrier */}
            <div className="mx-6 mt-4 bg-gray-50 rounded-[2rem] p-4 border border-gray-100">

                {/* Navigation mois */}
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => setMoisActuel(subMonths(moisActuel, 1))}
                        className="p-2 rounded-xl bg-white border border-gray-100 active:scale-90 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <p className="font-black text-gray-800 capitalize text-sm">
                        {format(moisActuel, "MMMM yyyy", { locale: fr })}
                    </p>
                    <button
                        onClick={() => setMoisActuel(addMonths(moisActuel, 1))}
                        className="p-2 rounded-xl bg-white border border-gray-100 active:scale-90 transition-all"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Jours semaine */}
                <div className="grid grid-cols-7 mb-2">
                    {jours.map((j, i) => (
                        <div key={i} className="text-center text-[10px] font-black text-gray-300 uppercase">
                            {j}
                        </div>
                    ))}
                </div>

                {/* Cases */}
                <div className="grid grid-cols-7 gap-y-1">
                    {cases.map((date, i) => {
                        const dansLeMois = isSameMonth(date, moisActuel);
                        const valide = aSeanceOuValide(date);
                        const annulee = estAnnulee(date);
                        const aDesSeancesActives = seancesActives(date).length > 0;
                        const estAujourdhui = isSameDay(date, today);
                        const estSelectionne = selectedDate ? isSameDay(date, selectedDate) : false;

                        return (
                            <div key={i} className="flex flex-col items-center py-1">
                                <button
                                    onClick={() => handleClickDate(date)}
                                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black transition-all active:scale-90
                    ${!dansLeMois ? "opacity-20" : ""}
                    ${estSelectionne ? "bg-[#76D7B1] text-white shadow-lg scale-110" : ""}
                    ${valide && !annulee && !estSelectionne ? "bg-white border-2 border-[#76D7B1] text-[#76D7B1] shadow-sm" : ""}
                    ${annulee && !estSelectionne ? "bg-red-50 border-2 border-red-200 text-red-300 line-through" : ""}
                    ${!valide && !annulee && !estSelectionne ? "text-gray-400 bg-white" : ""}
                    ${estAujourdhui && !estSelectionne ? "ring-2 ring-[#76D7B1] ring-offset-1" : ""}
                  `}
                                >
                                    {format(date, "d")}
                                </button>
                                {aDesSeancesActives && dansLeMois && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Légende */}
                <div className="flex flex-wrap items-center gap-3 mt-3 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-lg border-2 border-[#76D7B1]" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Séance prévue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Détails renseignés</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-lg border-2 border-red-200 bg-red-50" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Annulée</span>
                    </div>
                </div>
            </div>

            {/* Prochaines séances */}
            <div className="px-6 mt-6">
                <h2 className="text-lg font-black text-gray-800 mb-3">Prochaines séances</h2>
                <div className="space-y-2">
                    {prochains.length === 0 ? (
                        <p className="text-gray-300 text-sm font-bold text-center py-4">Aucune séance à venir.</p>
                    ) : prochains.map((date, i) => {
                        const detailsDuJour = seancesActives(date);
                        const isNext = i === 0;
                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => handleClickDate(date)}
                                className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] border-2 transition-all active:scale-95 text-left
                  ${isNext ? "border-[#76D7B1] bg-[#76D7B1]/5" : "border-gray-100 bg-gray-50"}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0
                  ${isNext ? "bg-[#76D7B1] text-white" : "bg-white border border-gray-200 text-gray-700"}`}>
                                    <span className="text-[9px] font-black uppercase">sam</span>
                                    <span className="text-lg font-black leading-none">{format(date, "d")}</span>
                                </div>
                                <div className="flex-1">
                                    <p className={`font-black capitalize text-sm ${isNext ? "text-[#76D7B1]" : "text-gray-700"}`}>
                                        {format(date, "d MMMM yyyy", { locale: fr })}
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                        {detailsDuJour.length > 0
                                            ? detailsDuJour.map((s: any) => s.titre).join(" · ")
                                            : "Aucun détail renseigné"}
                                    </p>
                                </div>
                                <ChevronRight className={`w-4 h-4 ${isNext ? "text-[#76D7B1]" : "text-gray-300"}`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Annonces */}
            <div className="px-6 mt-8">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-[#76D7B1]" />
                        Annonces
                    </h2>
                    {isStaff && (
                        <button
                            onClick={() => setShowAnnonceForm(!showAnnonceForm)}
                            className="bg-[#76D7B1] text-white px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4 stroke-[3px]" /> Publier
                        </button>
                    )}
                </div>

                {showAnnonceForm && isStaff && (
                    <div className="bg-gray-50 border-2 border-[#76D7B1]/30 rounded-[2rem] p-5 mb-4 space-y-3">
                        <input
                            type="text" placeholder="Titre de l'annonce" value={newTitre}
                            onChange={(e) => setNewTitre(e.target.value)}
                            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#76D7B1]"
                        />
                        <textarea
                            placeholder="Contenu..." value={newContenu}
                            onChange={(e) => setNewContenu(e.target.value)}
                            rows={3}
                            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#76D7B1] resize-none"
                        />
                        <button
                            onClick={handlePostAnnonce} disabled={posting}
                            className="w-full bg-[#76D7B1] text-white py-3 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                            {posting ? "Publication..." : "Publier"}
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    {annonces.length === 0 ? (
                        <div className="text-center py-10 text-gray-300 font-bold text-sm italic">
                            Aucune annonce pour le moment.
                        </div>
                    ) : annonces.map((annonce) => (
                        <button
                            key={annonce.id}
                            onClick={() => setAnnonceSelectionnee(annonce)}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-5 text-left active:scale-95 transition-all"
                        >
                            <p className="font-black text-gray-900 text-base">{annonce.titre}</p>
                            <p className="text-gray-600 text-sm mt-1.5 leading-relaxed line-clamp-2">{annonce.contenu}</p>
                            <p className="text-[10px] text-gray-300 font-bold mt-3 uppercase tracking-wider">
                                {annonce.profiles?.prenom} · {format(new Date(annonce.created_at), "d MMM yyyy", { locale: fr })}
                            </p>
                        </button>
                    ))}
                </div>

                {/* ── Modal détail annonce ── */}
                {annonceSelectionnee && (
                    <div className="fixed inset-0 z-[110] flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAnnonceSelectionnee(null)} />
                        <div className="relative z-10 w-full max-w-md bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-5">
                                <div className="flex-1 pr-4">
                                    <div className="w-10 h-1 bg-gray-200 rounded-full mb-4" />
                                    <div className="flex items-center gap-2 mb-1">
                                        <Megaphone className="w-4 h-4 text-[#76D7B1]" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#76D7B1]">Annonce</p>
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900">{annonceSelectionnee.titre}</h3>
                                </div>
                                <button
                                    onClick={() => setAnnonceSelectionnee(null)}
                                    className="p-2 bg-gray-100 rounded-full active:scale-90 transition-all mt-4 shrink-0"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed mb-4">{annonceSelectionnee.contenu}</p>
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider mb-6">
                                {annonceSelectionnee.profiles?.prenom} · {format(new Date(annonceSelectionnee.created_at), "d MMMM yyyy", { locale: fr })}
                            </p>
                            {isStaff && (
                                <button
                                    onClick={async () => {
                                        await handleDeleteAnnonce(annonceSelectionnee.id);
                                        setAnnonceSelectionnee(null);
                                    }}
                                    className="w-full border-2 border-red-200 text-red-400 py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer cette annonce
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal ── */}
            {showModal && selectedDate && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-t-[2.5rem] p-6 pb-28 shadow-2xl max-h-[80vh] overflow-y-auto">

                        {/* Header modal */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <div className="w-10 h-1 bg-gray-200 rounded-full mb-4" />
                                <h3 className="text-2xl font-black text-gray-900 capitalize">
                                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-all mt-4">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* CAS 1 : Jour ordinaire sans séance */}
                        {!estSamediValide(selectedDate) && seancesActives(selectedDate).length === 0 && (
                            <div>
                                <div className="bg-gray-50 rounded-[1.5rem] p-6 text-center mb-4">
                                    <p className="text-gray-400 font-bold text-sm">Pas de séance prévue ce jour.</p>
                                </div>
                                {isStaff && (
                                    <>
                                        {!showForm && (
                                            <button
                                                onClick={() => setShowForm(true)}
                                                className="w-full border-2 border-dashed border-[#76D7B1] text-[#76D7B1] py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                                            >
                                                <Plus className="w-4 h-4 stroke-[3px]" />
                                                Ajouter une séance exceptionnelle
                                            </button>
                                        )}
                                        {showForm && (
                                            <FormulaireSeance
                                                formTitre={formTitre} setFormTitre={setFormTitre}
                                                formDescription={formDescription} setFormDescription={setFormDescription}
                                                formHeureDebut={formHeureDebut} setFormHeureDebut={setFormHeureDebut}
                                                formHeureFin={formHeureFin} setFormHeureFin={setFormHeureFin}
                                                saving={saving}
                                                onCancel={() => setShowForm(false)}
                                                onSave={handleSaveSeance}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* CAS 2 : Séance annulée */}
                        {estAnnulee(selectedDate) && (
                            <div>
                                <div className="bg-red-50 border-2 border-red-100 rounded-[1.5rem] p-6 text-center mb-4">
                                    <Ban className="w-8 h-8 text-red-300 mx-auto mb-2" />
                                    <p className="text-red-400 font-black text-sm">Séance annulée</p>
                                </div>
                                {isStaff && (
                                    <button
                                        onClick={handleRetablirSeance}
                                        className="w-full border-2 border-[#76D7B1] text-[#76D7B1] py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        Rétablir cette séance
                                    </button>
                                )}
                            </div>
                        )}

                        {/* CAS 3 : Séance prévue (samedi valide OU séance exceptionnelle) non annulée */}
                        {(estSamediValide(selectedDate) || seancesActives(selectedDate).length > 0) && !estAnnulee(selectedDate) && (
                            <div>
                                {seancesActives(selectedDate).length === 0 ? (
                                    <div className="bg-gray-50 rounded-[1.5rem] p-6 text-center mb-4">
                                        <p className="text-gray-400 font-bold text-sm">Aucun détail renseigné pour cette séance.</p>
                                        {isStaff && <p className="text-gray-300 text-xs mt-1">Sois le premier à ajouter les infos !</p>}
                                    </div>
                                ) : (
                                    <div className="space-y-3 mb-4">
                                        {seancesActives(selectedDate).map((seance) => (
                                            <div key={seance.id} className="bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-4 relative">
                                                {isStaff && (
                                                    <button
                                                        onClick={() => handleDeleteSeance(seance.id)}
                                                        className="absolute top-3 right-3 p-1.5 bg-red-100 rounded-full active:scale-90 transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-2 mb-2 pr-8">
                                                    <BookOpen className="w-4 h-4 text-[#76D7B1]" />
                                                    <p className="font-black text-gray-900">{seance.titre}</p>
                                                </div>
                                                {seance.description && (
                                                    <p className="text-gray-600 text-sm mb-2">{seance.description}</p>
                                                )}
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {format(new Date(seance.date_debut), "HH:mm")}
                                                        {seance.date_fin && ` → ${format(new Date(seance.date_fin), "HH:mm")}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isStaff && !showDevoirs && (
                                    <div className="space-y-2">
                                        {!showForm && (
                                            <>
                                                {/* Bouton détails des devoirs */}
                                                {(estSamediValide(selectedDate) || seancesActives(selectedDate).length > 0) && (
                                                    <button
                                                        onClick={() => chargerDevoirs(selectedDate)}
                                                        className="w-full bg-gray-900 text-white py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                                                    >
                                                        <ClipboardList className="w-4 h-4" />
                                                        Détails des devoirs
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowForm(true)}
                                                    className="w-full border-2 border-dashed border-[#76D7B1] text-[#76D7B1] py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                                                >
                                                    <Plus className="w-4 h-4 stroke-[3px]" />
                                                    Ajouter une matière
                                                </button>
                                                <button
                                                    onClick={handleAnnulerSeance}
                                                    disabled={cancelling}
                                                    className="w-full border-2 border-red-200 text-red-400 py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                    {cancelling ? "Annulation..." : "Annuler cette séance"}
                                                </button>
                                            </>
                                        )}
                                        {showForm && (
                                            <FormulaireSeance
                                                formTitre={formTitre} setFormTitre={setFormTitre}
                                                formDescription={formDescription} setFormDescription={setFormDescription}
                                                formHeureDebut={formHeureDebut} setFormHeureDebut={setFormHeureDebut}
                                                formHeureFin={formHeureFin} setFormHeureFin={setFormHeureFin}
                                                saving={saving}
                                                onCancel={() => setShowForm(false)}
                                                onSave={handleSaveSeance}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* ── Vue devoirs ── */}
                                {isStaff && showDevoirs && (
                                    <div>
                                        {/* Header vue devoirs */}
                                        <button
                                            onClick={() => { setShowDevoirs(false); setEleveSelectionne(null); }}
                                            className="flex items-center gap-2 text-gray-500 font-bold text-sm mb-4 active:scale-95 transition-all"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Retour
                                        </button>

                                        {loadingDevoirs ? (
                                            <div className="flex justify-center py-8">
                                                <div className="w-6 h-6 rounded-full border-4 border-[#76D7B1] border-t-transparent animate-spin" />
                                            </div>
                                        ) : eleveSelectionne ? (
                                            /* ── Détail devoirs d un élève ── */
                                            <div>
                                                <button
                                                    onClick={() => setEleveSelectionne(null)}
                                                    className="flex items-center gap-2 text-gray-400 font-bold text-xs mb-3 active:scale-95 transition-all"
                                                >
                                                    <ArrowLeft className="w-3 h-3" />
                                                    Tous les élèves
                                                </button>
                                                <p className="font-black text-gray-900 text-lg mb-3">
                                                    {eleveSelectionne.profiles?.prenom} {eleveSelectionne.profiles?.nom}
                                                </p>
                                                <div className="space-y-2">
                                                    {eleveSelectionne.devoirs.map((devoir: any) => (
                                                        <button key={devoir.id} onClick={() => router.push(`/devoirs/${devoir.id}`)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-4 text-left active:scale-95 transition-all">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <BookOpen className="w-4 h-4 text-[#76D7B1]" />
                                                                <p className="font-black text-gray-900 text-sm">{devoir.titre}</p>
                                                            </div>
                                                            {devoir.matiere && (
                                                                <p className="text-[11px] font-bold text-[#76D7B1] uppercase tracking-wider mb-1">{devoir.matiere}</p>
                                                            )}
                                                            <p className="text-[10px] text-gray-400 font-bold">
                                                                À rendre le {format(new Date(devoir.date), "d MMMM", { locale: fr })}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            /* ── Liste des élèves avec devoirs ── */
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                                    Devoirs à rendre avant le {format(addDays(selectedDate, 6), "d MMMM", { locale: fr })}
                                                </p>
                                                {elevesAvecDevoirs.length === 0 ? (
                                                    <div className="bg-gray-50 rounded-[1.5rem] p-6 text-center">
                                                        <p className="text-gray-400 font-bold text-sm">Aucun devoir à rendre cette semaine.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {elevesAvecDevoirs.map((eleve: any) => (
                                                            <button
                                                                key={eleve.id}
                                                                onClick={() => setEleveSelectionne(eleve)}
                                                                className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-[1.5rem] active:scale-95 transition-all border-2 border-gray-100"
                                                            >
                                                                {/* Avatar */}
                                                                <div className="w-14 h-14 rounded-full bg-[#76D7B1]/20 flex items-center justify-center overflow-hidden">
                                                                    {eleve.profiles?.avatar_key ? (
                                                                        <img
                                                                            src={`https://api.dicebear.com/7.x/${eleve.profiles.avatar_key}/svg?seed=${eleve.profiles.avatar_seed}`}
                                                                            alt={eleve.profiles?.prenom}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-xl font-black text-[#76D7B1]">
                                                                            {eleve.profiles?.prenom?.[0]?.toUpperCase() || "?"}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider text-center leading-tight">
                                                                    {eleve.profiles?.prenom}
                                                                </p>
                                                                <span className="text-[9px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                                                                    {eleve.devoirs.length} devoir{eleve.devoirs.length > 1 ? "s" : ""}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Composant formulaire réutilisable ─────────────────────────────
function FormulaireSeance({
    formTitre, setFormTitre,
    formDescription, setFormDescription,
    formHeureDebut, setFormHeureDebut,
    formHeureFin, setFormHeureFin,
    saving, onCancel, onSave
}: any) {
    return (
        <div className="bg-[#76D7B1]/5 border-2 border-[#76D7B1]/30 rounded-[1.5rem] p-4 space-y-3">
            <input
                type="text"
                placeholder="Matière (ex: Cours de Maths)"
                value={formTitre}
                onChange={(e) => setFormTitre(e.target.value)}
                className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#76D7B1]"
            />
            <textarea
                placeholder="Description (optionnel)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#76D7B1] resize-none"
            />
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Début</label>
                    <input
                        type="time" value={formHeureDebut}
                        onChange={(e) => setFormHeureDebut(e.target.value)}
                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-[#76D7B1]"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Fin</label>
                    <input
                        type="time" value={formHeureFin}
                        onChange={(e) => setFormHeureFin(e.target.value)}
                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-[#76D7B1]"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
                >
                    Annuler
                </button>
                <button
                    onClick={onSave} disabled={saving || !formTitre.trim()}
                    className="flex-1 bg-[#76D7B1] text-white py-3 rounded-xl font-black text-sm active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
            </div>
        </div>
    );
}