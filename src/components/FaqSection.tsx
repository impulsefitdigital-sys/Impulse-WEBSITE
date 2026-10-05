import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FaqSection = () => {
  const [open, setOpen] = useState<string | null>(null);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faqs").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return null;
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="sec faq" id="faq">
      <div className="wrap faq-wrap">
        <div style={{ textAlign: "center" }}>
          <span className="eyebrow reveal" style={{ justifyContent: "center" }}>FAQ</span>
          <h2 className="display-md reveal" style={{ marginTop: 16 }}>Questions fréquentes.</h2>
        </div>

        <div className="faq-list">
          {faqs.map((f) => {
            const isOpen = open === f.id;
            return (
              <div className={`faq-item${isOpen ? " open" : ""}`} key={f.id}>
                <button className="faq-q" onClick={() => setOpen(isOpen ? null : f.id)} aria-expanded={isOpen}>
                  {f.question}
                  <span className="fic" />
                </button>
                <div className="faq-a" style={{ maxHeight: isOpen ? 400 : 0 }}>
                  <p>{f.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
