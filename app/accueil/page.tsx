"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { Clock, BookOpen, ChevronRight, Info, Clock3 } from "lucide-react";
import { format, addDays, isSaturday, startOfWeek, isToday, startOfDay } from "date-fns"; 
import { fr } from "date-fns/locale";

export default function AccueilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [nextSeance, setNextSeance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const startOfOurWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const calendarDays = Array.from({ length: 6 }).map((_, i) => addDays(startOfOurWeek, i));

  useEffect(() => {
    async function fetchHomeData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from("profiles").select("prenom").eq("id", user.id).single();
      setProfile(prof);

      const todayStart = startOfDay(new Date()).toISOString();

      const { data: seances } = await supabase
        .from("seances")
        .select("*")
        .gte("date_debut", todayStart) 
        .order("date_debut", { ascending: true }) 
        .limit(1)
        .maybeSingle();

      if (seances) setNextSeance(seances);
      setLoading(false);
    }
    fetchHomeData();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white pb-32 font-sans max-w-md mx-auto">
      
      {/* Header : Toujours visible */}
      <div className="p-8 pb-4 flex justify-between items-start">
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Bonjour, <br />
          {loading ? (
            <div className="h-9 w-32 bg-gray-100 animate-pulse rounded-lg mt-1"></div>
          ) : (
            <span className="text-[#76D7B1]">{profile?.prenom || "Élève"} !</span>
          )}
        </h1>
        {isSaturday(new Date()) && (
          <div className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-bounce shadow-md">
            JOUR J 🚀
          </div>
        )}
      </div>

      {/* Calendrier : Toujours visible car statique */}
      <div className="px-6 mt-4">
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-[2rem] border border-gray-100 shadow-sm">
          {calendarDays.map((date, i) => {
            const isDaySaturday = isSaturday(date);
            const isDayToday = isToday(date);

            return (
              <div 
                key={i} 
                className={`flex flex-col items-center p-2 rounded-2xl w-11 transition-all ${
                  isDaySaturday 
                    ? 'bg-red-500 text-white shadow-lg scale-110 z-10' 
                    : isDayToday 
                      ? 'bg-[#76D7B1] text-white shadow-md' 
                      : 'text-gray-400'
                }`}
              >
                <span className="text-[9px] font-bold uppercase mb-1">
                  {format(date, "eee", { locale: fr }).replace('.', '')}
                </span>
                <span className="text-base font-black">
                  {format(date, "d")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-8 mt-10">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Prochaine séance</h3>
        
        {loading ? (
          /* Skeleton pour la séance en cours de chargement */
          <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 h-64 animate-pulse flex flex-col justify-between">
            <div className="space-y-3">
               <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
               <div className="h-8 w-3/4 bg-gray-200 rounded-xl"></div>
            </div>
            <div className="h-12 w-full bg-gray-200 rounded-2xl"></div>
          </div>
        ) : nextSeance ? (
          <div className="bg-[#76D7B1] p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="bg-white/20 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                  {nextSeance.type || "Cours"}
                </span>
                <h4 className="text-2xl font-black mt-3 leading-tight">{nextSeance.titre}</h4>
              </div>
              <BookOpen className="w-8 h-8 opacity-40" />
            </div>

            <div className="mt-8 space-y-4 relative z-10">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <Clock className="w-4 h-4" />
                <span className="capitalize">{format(new Date(nextSeance.date_debut), "EEEE d MMMM", { locale: fr })}</span>
              </div>
              <div className="flex items-start gap-3 text-sm font-medium opacity-90">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="line-clamp-2 italic">{nextSeance.description}</p>
              </div>
            </div>

            <button className="w-full mt-8 bg-white text-[#76D7B1] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
              Détails complets
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="p-10 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 italic text-gray-400 text-sm">
            Pas de séance prévue pour cette semaine.
          </div>
        )}
      </div>
    </div>
  );
}