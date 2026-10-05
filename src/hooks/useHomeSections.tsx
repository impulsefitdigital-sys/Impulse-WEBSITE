import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomeSectionKey =
  | "hero"
  | "categories"
  | "trending"
  | "blog"
  | "about"
  | "world"
  | "contact"
  | "faq";

export const useHomeSections = () => {
  const { data } = useQuery({
    queryKey: ["home_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_sections")
        .select("key,is_visible");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isVisible = (key: HomeSectionKey) => {
    if (!data) return true; // default visible while loading
    const found = data.find((s) => s.key === key);
    return found ? found.is_visible : true;
  };

  return { isVisible };
};
