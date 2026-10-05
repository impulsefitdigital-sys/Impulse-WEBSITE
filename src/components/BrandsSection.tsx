const brands = ["Marriott", "Hilton", "Sheraton", "AccorHotels", "Club Med", "Fitness Park"];

const BrandsSection = () => (
  <section className="border-t border-border bg-background py-16">
    <div className="container mx-auto px-6 md:px-16">
      <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ils nous font confiance</p>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
        {brands.map((b) => (
          <span key={b} className="font-display text-lg font-bold text-muted-foreground/40 md:text-2xl">{b}</span>
        ))}
      </div>
    </div>
  </section>
);

export default BrandsSection;
