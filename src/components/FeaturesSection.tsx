import { motion } from "framer-motion";
import { Shield, Wrench, Truck, Award } from "lucide-react";

const features = [
  { icon: Shield, title: "Garantie à Vie", desc: "Structure acier garantie à vie sur toute la gamme Pro-Series." },
  { icon: Wrench, title: "Service & Maintenance", desc: "Équipe technique dédiée pour l'installation et l'entretien." },
  { icon: Truck, title: "Livraison & Montage", desc: "Livraison incluse et montage professionnel sur site." },
  { icon: Award, title: "Qualité Certifiée", desc: "Normes EN 957 et ISO 20957 pour usage intensif." },
];

const FeaturesSection = () => (
  <section id="apropos" className="border-t border-border bg-card py-20">
    <div className="container mx-auto px-6 md:px-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">Pourquoi nous choisir</p>
      <h2 className="mb-12 font-display text-3xl font-bold text-foreground md:text-4xl">L'Excellence Mécanique</h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="rounded-sm border border-border bg-background p-6">
            <f.icon className="mb-4 h-8 w-8 text-accent" />
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
