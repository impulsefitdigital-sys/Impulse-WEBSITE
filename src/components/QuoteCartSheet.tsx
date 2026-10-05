import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuoteCart } from "@/contexts/QuoteCartContext";
import { Minus, Plus, Trash2, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const QuoteCartSheet = () => {
  const { items, removeItem, updateQuantity, isOpen, setIsOpen, itemCount } = useQuoteCart();
  const isMobile = useIsMobile();

  const handleValidate = () => {
    setIsOpen(false);
    window.location.href = "/devis";
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* mobile : panneau qui monte du bas (max 75 % de l'écran) pour garder la page visible ; bureau : tiroir à droite */}
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "imp-cart-sheet-mobile flex max-h-[75dvh] flex-col rounded-t-2xl px-5 pb-5 pt-3" : "flex w-full max-w-[420px] flex-col"}
        style={{ background: "var(--ink)", zIndex: 100 }}
      >
        {isMobile && <div className="imp-cart-grabber" aria-hidden="true" />}
        <div className="imp-cart">
          <SheetHeader>
            <SheetTitle asChild>
              <div className="imp-cart-title"><FileText className="h-5 w-5" /> Mon devis ({itemCount})</div>
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="imp-cart-empty">
              <FileText className="h-12 w-12" />
              <p style={{ fontSize: 15 }}>Votre devis est vide</p>
              <p style={{ fontSize: 13, color: "var(--steel-dim)" }}>Ajoutez des équipements depuis le catalogue</p>
            </div>
          ) : (
            <>
              <div className="imp-cart-list">
                {items.map((item) => (
                  <div className="imp-cart-item" key={item.id}>
                    <div className="thumb">{item.image_url && <img src={item.image_url} alt={item.name} />}</div>
                    <div className="ci-body">
                      <div>
                        <p className="ci-name">{item.name}</p>
                        {item.category && <p className="ci-cat">{item.category}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="imp-cart-qty">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Diminuer"><Minus className="h-3 w-3" /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Augmenter"><Plus className="h-3 w-3" /></button>
                        </div>
                        <button className="imp-cart-remove" onClick={() => removeItem(item.id)} aria-label="Retirer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="imp-cart-footer">
                <button className="imp-cart-validate" onClick={handleValidate}>
                  <FileText className="h-4 w-4" /> Voir le devis
                </button>
                <button className="imp-cart-continue" onClick={() => setIsOpen(false)}>
                  Continuer mes choix
                </button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuoteCartSheet;
