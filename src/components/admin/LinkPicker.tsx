import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Choix d'un lien du site dans une liste (pages, catégories, sous-catégories, gammes),
 * ou saisie libre (« Autre lien… »). Utilisé pour les boutons du carrousel.
 */
const STATIC_PAGES: { label: string; href: string }[] = [
  { label: "Accueil", href: "/" },
  { label: "Professionnel (tous)", href: "/professionnel" },
  { label: "Résidentiel (tous)", href: "/residentiel" },
  { label: "Solutions", href: "/consulting" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Blog", href: "/blog" },
  { label: "À propos", href: "/a-propos" },
  { label: "Contact", href: "/contact" },
  { label: "Demande de devis", href: "/devis" },
];
const USAGE_LABEL: Record<string, string> = { professionnel: "Professionnel", residentiel: "Résidentiel" };
const CUSTOM = "__autre__";

interface Props { value: string; onChange: (v: string) => void; id?: string }
interface Cat { slug: string; title: string; usage_type: string }
interface Sub extends Cat { category_slug: string }
interface Rng { code: string; usage_type: string; category: string; subcategory: string }

const LinkPicker = ({ value, onChange, id }: Props) => {
  const { data } = useQuery({
    queryKey: ["admin-link-targets"],
    queryFn: async () => {
      const [cats, subs, ranges] = await Promise.all([
        supabase.from("equipment_categories").select("slug, title, usage_type, sort_order").order("sort_order"),
        supabase.from("equipment_subcategories").select("slug, title, category_slug, usage_type, sort_order").order("sort_order"),
        supabase.from("product_ranges").select("code, usage_type, category, subcategory, is_active").eq("is_active", true).order("code"),
      ]);
      return { cats: (cats.data || []) as Cat[], subs: (subs.data || []) as Sub[], ranges: (ranges.data || []) as Rng[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const groups = useMemo(() => {
    const out: { label: string; items: { label: string; href: string }[] }[] = [{ label: "Pages", items: STATIC_PAGES }];
    if (!data) return out;
    for (const usage of ["professionnel", "residentiel"]) {
      const items: { label: string; href: string }[] = [];
      for (const c of data.cats.filter((c) => c.usage_type === usage)) {
        items.push({ label: `${c.title}`, href: `/${usage}/${c.slug}` });
        for (const s of data.subs.filter((s) => s.usage_type === usage && s.category_slug === c.slug)) {
          items.push({ label: `${c.title} › ${s.title}`, href: `/${usage}/${c.slug}/${s.slug}` });
          const codes = [...new Set(data.ranges.filter((r) => r.usage_type === usage && r.category === c.slug && r.subcategory === s.slug).map((r) => r.code))];
          for (const code of codes) items.push({ label: `${c.title} › ${s.title} › gamme ${code}`, href: `/${usage}/${c.slug}/${s.slug}/${code.toLowerCase()}` });
        }
      }
      out.push({ label: USAGE_LABEL[usage], items });
    }
    return out;
  }, [data]);

  const known = groups.some((g) => g.items.some((i) => i.href === value));
  const selectValue = !value ? "" : known ? value : CUSTOM;
  const cls = "w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="space-y-2">
      <select id={id} value={selectValue} onChange={(e) => onChange(e.target.value === CUSTOM ? (known ? "" : value) || "/" : e.target.value)} className={cls}>
        <option value="">— Choisir une page —</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((i) => <option key={i.href} value={i.href}>{i.label}</option>)}
          </optgroup>
        ))}
        <option value={CUSTOM}>Autre lien…</option>
      </select>
      {selectValue === CUSTOM && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/produit/… ou https://…" className={cls} />
      )}
    </div>
  );
};

export default LinkPicker;
