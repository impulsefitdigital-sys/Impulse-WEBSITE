import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

const fallbackImages: Record<string, string> = {
  Professionnel: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1000&q=80",
  Résidentiel: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1000&q=80",
  Consulting: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1000&q=80",
  Réalisations: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=1000&q=80",
};

const subCats = [
  { label: "Cardio", slug: "cardio" },
  { label: "Musculation", slug: "musculation" },
  { label: "Fonctionnel", slug: "fonctionnel" },
];

const isUsageCard = (title: string) => {
  const t = title.toLowerCase();
  return t.includes("professionnel") || t.includes("résidentiel") || t.includes("residentiel");
};
const usageSlug = (title: string) => (title.toLowerCase().includes("professionnel") ? "professionnel" : "residentiel");

const CategoryCardsSection = () => {
  const { data: cards } = useQuery({
    queryKey: ["category-cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_cards").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  if (!cards || cards.length === 0) return null;

  return (
    <section className="univers" aria-label="Nos univers">
      <div className="u-grid">
        {cards.map((card) => {
          const usage = isUsageCard(card.title);
          const slug = usageSlug(card.title);
          const img = card.image_url || fallbackImages[card.title] || fallbackImages.Professionnel;

          const inner = (
            <>
              <img src={img} alt={card.title} loading="lazy" />
              <span className="u-red-edge" />
              <h3>{card.title}</h3>
              {card.description && <p>{card.description}</p>}
              <div className="u-links">
                {usage ? (
                  subCats.map((sc) => (
                    <a key={sc.slug} href={`/${slug}/${sc.slug}`} onClick={(e) => e.stopPropagation()}>
                      {sc.label}
                    </a>
                  ))
                ) : (
                  <span className="solo">
                    {card.cta_text || "Explorer"} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </>
          );

          return usage ? (
            <div className="u-tile" key={card.id}>{inner}</div>
          ) : (
            <a className="u-tile" key={card.id} href={card.cta_link || "#"}>{inner}</a>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryCardsSection;
