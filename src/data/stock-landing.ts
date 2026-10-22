/**
 * Stock disponible à la vente sur la landing page /lp/musculation.
 * Source : « Stock liste de prix revendeur » — offre n° 26-259 du 29/09/2026, valable jusqu'au 29/10/2026.
 *
 * pu = prix unitaire HT en dirhams (colonne « PU » de l'offre), affiché comme prix de vente.
 * Le prix barré affiché = pu × 1,20 (demande d'Adil du 22/10/2026).
 * La fiche du site (photo, nom, catégorie) est retrouvée par la référence (ex. IT9515) dans le nom du produit.
 *
 * Pour mettre à jour le stock : modifier cette liste (une ligne par machine), puis publier.
 */
export interface StockItem { ref: string; pu: number; designation: string }

export const STOCK_OFFER = { numero: "26-259", date: "29/09/2026", validite: "29/10/2026" };
export const CROSSED_PRICE_RATIO = 1.2;

export const STOCK_ITEMS: StockItem[] = [
  { ref: "IT9515", pu: 26000, designation: "IMPULSE PEC FLY/REAR DELT IT9515-107" },
  { ref: "IT9522", pu: 26000, designation: "IMPULSE LAT PULLDOWN/VERTICAL ROW IT9522-134" },
  { ref: "IT9528", pu: 26000, designation: "IMPULSE LEG CURL/LEG EXTENSION IT9528-93" },
  { ref: "IT9537", pu: 26000, designation: "IMPULSE STANDING CHEST FLY IT9537-107" },
  { ref: "IT9530", pu: 36000, designation: "IMPULSE DUAL ADJUSTABLE PULLEY IT9530-134" },
  { ref: "ITF8102", pu: 3500, designation: "IMPULSE UTILITYB BENCH ITF8102-WX" },
  { ref: "ITF8202", pu: 8500, designation: "IMPULSE OLYMPIC FLAT BENCH ITF8202-WX" },
  { ref: "ITF8501", pu: 4500, designation: "IMPULSE SEATED ARM CURL BENCH ITF8501" },
  { ref: "ITF8802", pu: 5500, designation: "IMPULSE FI-BENCH ITF8802-WX" },
  { ref: "ITF8618", pu: 4000, designation: "IMPULSE SISSY SQUAT ITF8618" },
  { ref: "ITF8203", pu: 8500, designation: "OLYMPIC INCLINE BENCH ITF8203-WX" },
  { ref: "ITF8722", pu: 22000, designation: "IMPULSE 7° INCLINE SMITH MACHINE ITF8722" },
  { ref: "ITF8721", pu: 22000, designation: "IMPULSE VERTICAL SMITH ITF8721-WX" },
  { ref: "SL7001", pu: 16500, designation: "IMPULSE P/L CHEST PRESS SL7001" },
  { ref: "SL7002", pu: 16500, designation: "IMPULSE P/L PULLDOWN SL7002" },
  { ref: "SL7003", pu: 16500, designation: "IMPULSE P/L SHOULDER PRESS SL7003" },
  { ref: "SL7004", pu: 16500, designation: "IMPULSE P/L LOW ROW SL7004" },
  { ref: "SL7005", pu: 16500, designation: "IMPULSE P/L INCLINE CHEST PRESS SL7005" },
  { ref: "SL7006", pu: 22000, designation: "IMPULSE P/L LEG PRESS SL7006" },
  { ref: "SL7007", pu: 16500, designation: "IMPULSE P/L ROW SL7007" },
  { ref: "SL7017", pu: 9500, designation: "IMPULSE SEATED CALF RAISE SL7017" },
  { ref: "SL7019", pu: 9500, designation: "IMPULSE INCLINE ROW SL7019" },
  { ref: "SL7020", pu: 32000, designation: "IMPULSE 45° LEG PRESS SL7020" },
  { ref: "SL7028", pu: 9500, designation: "OLYMPIC FLAT BENCH PRESS SL7028" },
  { ref: "SL7029", pu: 10500, designation: "OLYMPIC INCLINE BENCH PRESS SL7029" },
  { ref: "SL7038", pu: 15000, designation: "IMPULSE HIP TRAINER SL7038" },
  { ref: "SL7046", pu: 22000, designation: "IMPULSE ISO-LATERAL SUPER CHEST PRESS SL7046" },
  { ref: "IFP1103", pu: 9500, designation: "Standing Lateral Raise IFP1103-WX" },
  { ref: "IFP1201", pu: 12500, designation: "IMPULSE P/L SEATED CHEST PRESS IFP1201-WX" },
  { ref: "IFP1206", pu: 9500, designation: "IMPULSE P/L STANDING CHEST FLY IFP1206-WX" },
  { ref: "IFP1302", pu: 12500, designation: "IMPULSE P/L SEATED ROW IFP1302-WX" },
  { ref: "IFP1604", pu: 12500, designation: "IMPULSE PRONE LEG CURL IFP1604-WX" },
  { ref: "IFP1605", pu: 12500, designation: "IMPULSE SEATED LEG EXTENSION IFP1605- WX" },
  { ref: "IFP1615", pu: 12500, designation: "IMPULSE BELT SQUAT IFP1615-WX" },
  { ref: "IFP1623", pu: 6500, designation: "IMPULSE P/L SEATED CALF RAISE IFP1623- WX" },
  { ref: "IFP1707", pu: 15000, designation: "IMPULSE LEVERAGE SQUAT/CALF IFP1707- WX" },
  { ref: "IFP1101", pu: 12500, designation: "IMPULSE SEATED SHOULDER PRESS IFP1101-WX" },
  { ref: "IFP1301", pu: 12500, designation: "IMPULSE P/L LAT PULLDOWN IFP1301-WX" },
  { ref: "IFP1305", pu: 7500, designation: "IMPULSE P/L T-BAR ROW IFP1305-WX" },
  { ref: "IFP1616", pu: 9500, designation: "IMPULSE VERTICAL HIP THRUST IFP1616- WX" },
  { ref: "IFP1614", pu: 12500, designation: "IMPULSE HIP THRUST IFP1614" },
  { ref: "ECP101", pu: 22500, designation: "IMPULSE P/L SHOULDER PRESS ECP101" },
  { ref: "ECP201", pu: 24500, designation: "IMPULSE P/L CHEST PRESS ECP201" },
  { ref: "ECP301", pu: 22500, designation: "IMPULSE P/L LAT PULLDOWN PRESS ECP301" },
  { ref: "ECP302", pu: 22500, designation: "IMPULSE P/L SEATED ROW ECP302" },
  { ref: "ECP617", pu: 35000, designation: "IMPULSE P/L DUAL HACK SQUAT ECP617" },
  { ref: "ECP713", pu: 35000, designation: "IMPULSE P/L V-SQUAT ECP713" },
  { ref: "ECP721", pu: 28000, designation: "IMPULSE SMITH MACHINE ECP721" },
  { ref: "ECP103", pu: 22000, designation: "IMPULSE P/L STANDING LATERAL RAISE ECP103" },
];
