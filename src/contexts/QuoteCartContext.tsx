import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export interface QuoteItem {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  quantity: number;
}

interface QuoteCartContextType {
  items: QuoteItem[];
  addItem: (product: Omit<QuoteItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const QuoteCartContext = createContext<QuoteCartContextType | null>(null);

const QUOTE_CART_STORAGE_KEY = "impulse-quote-cart";

const isQuoteItem = (value: unknown): value is QuoteItem => {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<QuoteItem>;

  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.category === "string" &&
    (typeof item.image_url === "string" || item.image_url === null) &&
    typeof item.quantity === "number" &&
    item.quantity > 0
  );
};

const readStoredItems = (): QuoteItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const storedItems = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY);
    if (!storedItems) return [];

    const parsedItems = JSON.parse(storedItems);
    return Array.isArray(parsedItems) ? parsedItems.filter(isQuoteItem) : [];
  } catch {
    return [];
  }
};

export const useQuoteCart = () => {
  const ctx = useContext(QuoteCartContext);
  if (!ctx) throw new Error("useQuoteCart must be used within QuoteCartProvider");
  return ctx;
};

export const QuoteCartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<QuoteItem[]>(readStoredItems);
  const [isOpen, setIsOpenState] = useState(false);
  const setIsOpen = useCallback((open: boolean) => {
    if (open) track("quote_open");
    setIsOpenState(open);
  }, []);

  const addItem = useCallback((product: Omit<QuoteItem, "quantity">) => {
    const alreadyInCart = items.some((item) => item.id === product.id);

    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { ...product, quantity: 1 }];
    });
    track("quote_add", { product_id: product.id, label: product.name });
    toast.success(alreadyInCart ? "Quantité mise à jour dans le devis" : "Produit ajouté au devis", {
      description: product.name,
      duration: 2500,
      closeButton: true,
    });
    setIsOpenState(true); // ouverture automatique : ne compte pas comme « devis consulté »
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (items.length === 0) {
      window.localStorage.removeItem(QUOTE_CART_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(QUOTE_CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <QuoteCartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, isOpen, setIsOpen }}>
      {children}
    </QuoteCartContext.Provider>
  );
};
