import { Phone, Mail, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TopBanner = () => {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["contact-settings-topbanner"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((s: any) => {
        map[s.key] = s.value;
      });
      return map;
    },
  });

  const phone = settings?.phone_1 || "";
  const emailContact = settings?.email_1 || "";

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim() });
    setSending(false);
    if (error) {
      toast.error("Erreur lors de l'inscription");
    } else {
      toast.success("Merci pour votre inscription !");
      setEmail("");
      setOpen(false);
    }
  };

  return (
    <div className="block w-full bg-background text-foreground border-b border-border">
      <div className="flex items-center justify-center gap-4 md:gap-6 px-4 md:px-8 lg:px-16 py-1.5 text-xs">
        {phone && (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="font-medium">{phone}</span>
          </a>
        )}
        {emailContact && (
          <a
            href={`mailto:${emailContact}`}
            className="flex items-center gap-1.5 hover:text-accent transition-colors"
            aria-label="Email de contact"
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="font-medium hidden md:inline">{emailContact}</span>
          </a>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
              aria-label="S'inscrire à la newsletter"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="font-medium hidden md:inline">Newsletter</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inscription à la newsletter</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3 mt-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={sending}
                className="btn-slide btn-slide-accent rounded-full px-4 py-2 text-sm"
              >
                {sending ? "Envoi..." : "S'inscrire"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TopBanner;
