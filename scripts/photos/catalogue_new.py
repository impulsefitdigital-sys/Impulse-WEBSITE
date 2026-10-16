# -*- coding: utf-8 -*-
"""Fiches des 124 références photographiées absentes du site (16/10/2026).

Source des noms :
 - "cat"  : catalogue distributeur Impulse en ligne (elitefitness.co.nz, originfitness.com)
 - "pdf"  : MS Modules intro.pdf (dossier photos du client)
 - "serie": même numéro que l'équivalent IT95 / IF93 / FE97 déjà nommé (numérotation commune Impulse)
 - "visuel": déduit des photos -> À VÉRIFIER
"""

P = "professionnel"; B = "both"
MUSC = "Musculation"; FONC = "Fonctionnel"; CARD = "Cardio"
MONO = "Mono-stations"; MULTI = "Multi-stations"; GUID = "Charges Guidées"; LIB = "Charges Libres"
RIGS = "Cages & Rigs"; TAPIS = "Tapis de course"; VELO = "Vélos"

# ref: (nom affiché, range_code, usage, catégorie, sous-catégorie, source)
NEW = {
  # --- IF93 (pile de poids, Pro + Résidentiel comme la gamme) ---
  "IF9303": ("Arm Curl IF9303", "IF93", B, MUSC, MONO, "cat"),
  "IF9305": ("Leg Extension IF9305", "IF93", B, MUSC, MONO, "cat"),
  "IF9306": ("Seated Leg Curl IF9306", "IF93", B, MUSC, MONO, "cat"),
  "IF9314": ("Abdominal IF9314", "IF93", B, MUSC, MONO, "cat"),
  "IF9316": ("Rotary Calf IF9316", "IF93", B, MUSC, MONO, "cat"),
  "IF9317": ("Seated Dip IF9317", "IF93", B, MUSC, MONO, "cat"),
  "IF9318": ("Torso Rotation IF9318", "IF93", B, MUSC, MONO, "cat"),
  "IF9321": ("Prone Leg Curl IF9321", "IF93", B, MUSC, MONO, "cat"),
  "IF9323": ("Arm Extension IF9323", "IF93", B, MUSC, MONO, "cat"),
  "IF9324": ("Lateral Raise IF9324", "IF93", B, MUSC, MONO, "cat"),
  "IF9325": ("Adjustable Hi/Lo Pulley IF9325", "IF93", B, MUSC, MULTI, "cat"),
  "IF9326": ("Kick Back IF9326", "IF93", B, MUSC, MONO, "cat"),
  "IF9327": ("4 Stack Multi-Station IF9327", "IF93", B, MUSC, MULTI, "cat"),
  "IF9328": ("Leg Extension / Leg Curl IF9328", "IF93", B, MUSC, MONO, "cat"),
  "IF9329": ("Multi Press IF9329", "IF93", B, MUSC, MONO, "cat"),
  "IF9330": ("Dual Adjustable Pulley IF9330", "IF93", B, MUSC, MULTI, "cat"),
  "IF9332": ("Back Extension IF9332", "IF93", B, MUSC, MONO, "cat"),
  "IF9333": ("Biceps Curl / Triceps Extension IF9333", "IF93", B, MUSC, MONO, "cat"),
  "IF9335": ("Abductor IF9335", "IF93", B, MUSC, MONO, "cat"),
  "IF9336": ("Adductor IF9336", "IF93", B, MUSC, MONO, "cat"),
  "IF9337": ("Standing Pec Fly IF9337", "IF93", B, MUSC, MONO, "serie"),
  # --- IT95 (Pro, mono-stations) ---
  "IT9502": ("Lat Pulldown IT9502", "IT95", P, MUSC, MONO, "cat"),
  "IT9503": ("Arm Curl IT9503", "IT95", P, MUSC, MONO, "cat"),
  "IT9505": ("Leg Extension IT9505", "IT95", P, MUSC, MONO, "cat"),
  "IT9506": ("Seated Leg Curl IT9506", "IT95", P, MUSC, MONO, "cat"),
  "IT9508": ("Abductor & Adductor IT9508", "IT95", P, MUSC, MONO, "cat"),
  "IT9509": ("Total Hip IT9509", "IT95", P, MUSC, MONO, "cat"),
  "IT9514": ("Abdominal IT9514", "IT95", P, MUSC, MONO, "cat"),
  "IT9516": ("Rotary Calf IT9516", "IT95", P, MUSC, MONO, "cat"),
  "IT9519": ("Vertical Row IT9519", "IT95", P, MUSC, MONO, "cat"),
  "IT9520": ("Weight Assisted Chin / Dip IT9520", "IT95", P, MUSC, MONO, "cat"),
  "IT9521": ("Prone Leg Curl IT9521", "IT95", P, MUSC, MONO, "cat"),
  "IT9524": ("Lateral Raise IT9524", "IT95", P, MUSC, MONO, "cat"),
  "IT9525": ("Adjustable Hi/Lo Pulley IT9525", "IT95", P, MUSC, MULTI, "cat"),
  "IT9526": ("Glute IT9526", "IT95", P, MUSC, MONO, "cat"),          # + photos IT9526B (argent)
  "IT9527OPT": ("Option Cable Crossover IT9527OPT", "IT95", P, MUSC, MULTI, "cat"),
  "IT9530": ("Dual Adjustable Pulley IT9530", "IT95", P, MUSC, MULTI, "cat"),
  "IT9532": ("Back Extension IT9532", "IT95", P, MUSC, MONO, "cat"),
  "IT9534": ("Abdominal / Back Extension IT9534", "IT95", P, MUSC, MONO, "cat"),
  # --- Exoform FE97 (Pro, mono-stations) ---
  "FE9704": ("Pectoral FE9704", "Exoform", P, MUSC, MONO, "cat"),
  "FE9716": ("Rotary Calf FE9716", "Exoform", P, MUSC, MONO, "cat"),
  "FE9718": ("Torso Rotation FE9718", "Exoform", P, MUSC, MONO, "cat"),
  # --- IFP (plate loaded semi-pro, Pro + Résidentiel) ---
  "IFP1607": ("Abductor / Adductor IFP1607", "IFP", B, MUSC, GUID, "visuel"),
  "IFP1614": ("Hip Thrust IFP1614", "IFP", B, MUSC, GUID, "cat"),
  "IFP1623": ("Seated Calf Raise IFP1623", "IFP", B, MUSC, GUID, "cat"),
  # --- ITF8 (charges libres, Pro) ---
  "ITF8202OPT": ("Safety Bar Attachment ITF8202OPT", "ITF", P, MUSC, LIB, "cat"),
  "ITF8301": ("Seal Row Bench ITF8301", "ITF", P, MUSC, LIB, "cat"),
  "ITF8406": ("Glute & Ham Bench ITF8406", "ITF", P, MUSC, LIB, "cat"),
  "ITF8701": ("Knee Raise Station ITF8701", "ITF", P, MUSC, LIB, "cat"),
  "ITF8803": ("Banc réglable ITF8803", "ITF", P, MUSC, LIB, "visuel"),
  "ITF8901": ("Banc multifonction ITF8901", "ITF", P, MUSC, LIB, "visuel"),
  # --- ECP (plate loaded haut de gamme, Pro) ---
  "ECP103": ("Standing Lateral Raise ECP103", "ECP", P, MUSC, GUID, "cat"),
  "ECP721": ("Smith Machine ECP721", "ECP", P, MUSC, GUID, "cat"),
  # --- SL (Pro) : machines -> charges guidées, racks / bancs -> charges libres ---
  "SL7001": ("Chest Press SL7001", "SL", P, MUSC, GUID, "cat"),
  "SL7005": ("Incline Chest Press SL7005", "SL", P, MUSC, GUID, "cat"),
  "SL7006": ("Leg Press SL7006", "SL", P, MUSC, GUID, "cat"),
  "SL7008": ("Rear Kick SL7008", "SL", P, MUSC, GUID, "cat"),
  "SL7011": ("FID Bench SL7011", "SL", P, MUSC, LIB, "cat"),
  "SL7012": ("FID Bench SL7012", "SL", P, MUSC, LIB, "cat"),
  "SL7013": ("Glute Ham Bench SL7013", "SL", P, MUSC, LIB, "cat"),
  "SL7014": ("Half Power Rack SL7014", "SL", P, MUSC, LIB, "cat"),
  "SL7015": ("Full Power Rack SL7015", "SL", P, MUSC, LIB, "cat"),
  "SL7020": ("Leg Press 45° SL7020", "SL", P, MUSC, GUID, "cat"),
  "SL7038": ("Total Hip SL7038", "SL", P, MUSC, GUID, "cat"),
  "SL7039": ("Standing Press SL7039", "SL", P, MUSC, GUID, "cat"),
  "SL7040": ("Squat Lunge SL7040", "SL", P, MUSC, GUID, "cat"),
  "SL7042": ("Smith Machine SL7042", "SL", P, MUSC, GUID, "cat"),
  "SL7045OPT": ("Option Chin-up SL7045OPT", "SL", P, MUSC, LIB, "cat"),
  "SL7046": ("Iso-Lateral Super Chest Press SL7046", "SL", P, MUSC, GUID, "cat"),
  "SL7057": ("Pendulum Squat SL7057", "SL", P, MUSC, GUID, "cat"),
  # --- Cardio ---
  "AC2970H": ("Tapis de Course AC2970H", "AC2", P, CARD, TAPIS, "cat"),
  "AC4015": ("Tapis de Course AC4015", "AC4", P, CARD, TAPIS, "cat"),
  "AC800": ("Tapis de Course AC800", "AC8", P, CARD, TAPIS, "cat"),
  "AC808": ("Tapis de Course AC808", "AC8", P, CARD, TAPIS, "cat"),
  "RT750": ("Tapis de Course RT750", "RT", P, CARD, TAPIS, "cat"),
  "PS300": ("Vélo de Spinning PS300", "PS", P, CARD, VELO, "cat"),
  "PS450": ("Vélo de Spinning PS450", "PS", P, CARD, VELO, "cat"),
  # --- I-Zone (Pro, cages & rigs) ---
  "IZ-H": ("Cage Crosstraining I-Zone IZ-H", "ZONE", P, FONC, RIGS, "cat"),
  "IZ-L": ("Cage Crosstraining I-Zone IZ-L", "ZONE", P, FONC, RIGS, "cat"),
  "IZ-O": ("Cage Crosstraining I-Zone IZ-O", "ZONE", P, FONC, RIGS, "cat"),
  "IZ-T": ("Cage Crosstraining I-Zone IZ-T", "ZONE", P, FONC, RIGS, "cat"),
  "IZ-X": ("Cage Crosstraining I-Zone IZ-X", "ZONE", P, FONC, RIGS, "cat"),
  "IZ-ROLLCAGE": ("Rollcage I-Zone", "ZONE", P, FONC, RIGS, "cat"),
  # --- MS Mega Space (modules, Pro) : noms du PDF client ---
  "MS01": ("Half Rack MS01", "MS", P, FONC, RIGS, "pdf"),
  "MS02": ("Power Rack MS02", "MS", P, FONC, RIGS, "pdf"),
  "MS11": ("Lat Pulldown / Vertical Row MS11", "MS", P, FONC, RIGS, "pdf"),
  "MS12": ("Poulie fonctionnelle MS12", "MS", P, FONC, RIGS, "pdf"),
  "MS13": ("Jammer Arm MS13", "MS", P, FONC, RIGS, "pdf"),
  "MS14": ("Belt Squat MS14", "MS", P, FONC, RIGS, "pdf"),
  "MS15": ("Endless Rope Trainer MS15", "MS", P, FONC, RIGS, "pdf"),
  "MS21": ("Pont de liaison entre racks MS21", "MS", P, FONC, RIGS, "pdf"),
  "MS22": ("Pont de liaison entre racks 2,6 m MS22", "MS", P, FONC, RIGS, "pdf"),
  "MS27": ("Side Storage MS27", "MS", P, FONC, RIGS, "cat"),
  "MS41": ("Plateforme utilitaire réglable MS41", "MS", P, FONC, RIGS, "pdf"),
  "MS42": ("Rangement MS42", "MS", P, FONC, RIGS, "visuel"),
  "MS43": ("Broche utilitaire réglable MS43", "MS", P, FONC, RIGS, "pdf"),
  "MS44": ("Support barre / plateforme MS44", "MS", P, FONC, RIGS, "pdf"),
  "MS45": ("Coussin Foam Roller MS45", "MS", P, FONC, RIGS, "pdf"),
  "MS50": ("Plaque logo MS50", "MS", P, FONC, RIGS, "pdf"),
  "MS7040": ("Étagère de rangement MS7040", "MS", P, FONC, RIGS, "visuel"),
  "MS704001": ("Storage Rack Frame MS704001", "MS", P, FONC, RIGS, "pdf"),
  "MS7041": ("Barbell Lifter MS7041", "MS", P, FONC, RIGS, "pdf"),
  "MS7042": ("Farmer's Walk Bar MS7042", "MS", P, FONC, RIGS, "pdf"),
  "MS7043": ("Poignée T-Bar Row MS7043", "MS", P, FONC, RIGS, "pdf"),
  "MS7048": ("Power Sled MS7048", "MS", P, FONC, RIGS, "pdf"),
  # --- FF (modules de rig, Pro) : noms déduits des photos -> À VÉRIFIER ---
  "FF00": ("Main Rack mural FF00", "FF", P, FONC, RIGS, "cat"),
  "FF01": ("Main Rack central FF01", "FF", P, FONC, RIGS, "cat"),
  "FF02": ("Back Rack FF02", "FF", P, FONC, RIGS, "cat"),
  "FF1001": ("Cadre FF1001", "FF", P, FONC, RIGS, "visuel"),
  "FF1011": ("Module d'extension mural FF1011", "FF", P, FONC, RIGS, "cat"),
  "FF1012": ("Module d'extension central FF1012", "FF", P, FONC, RIGS, "cat"),
  "FF1013": ("Extension Back Rack FF1013", "FF", P, FONC, RIGS, "cat"),
  "FF23": ("Rangement disques d'entraînement FF23", "FF", P, FONC, RIGS, "cat"),
  "FF24": ("Rangement haltères / kettlebells FF24", "FF", P, FONC, RIGS, "cat"),
  "FF25": ("Rangement ballons FF25", "FF", P, FONC, RIGS, "cat"),
  "FF44": ("Rangement barres FF44", "FF", P, FONC, RIGS, "cat"),
  "FF46": ("Cible Wall Ball FF46", "FF", P, FONC, RIGS, "cat"),
  "FF52": ("Attache Landmine FF52", "FF", P, FONC, RIGS, "cat"),
  "FF53": ("Rangement vertical haltères FF53", "FF", P, FONC, RIGS, "cat"),
  "FFSP": ("Storage Post FF-SP", "FF", P, FONC, RIGS, "cat"),
}

# Références dont les photos vont sur une fiche EXISTANTE (pas de nouvelle fiche)
MERGE = {
  "FE9710B": ("FE9710", "noir"),     # FE9710 = argent sur le site, FE9710B = même machine en noir
  "IT9526B": ("IT9526", "argent"),   # même machine (Glute), version argent
  "ITF8721": ("IFP8721", None),      # fiche existante « Vertical Smith Machine IFP8721 » : faute de frappe, c'est l'ITF8721
  "ITF8722": ("IFP8722", None),      # fiche existante « Smith Machine Inclinée 7° IFP8722 » = ITF8722
}

# Phrase de gamme (description courte)
RANGE_TXT = {
  "IF93": "appareil de musculation à charge guidée (pile de poids) de la série Impulse IF93, robuste et polyvalent, adapté aux salles de sport comme aux espaces résidentiels exigeants",
  "IT95": "appareil de musculation professionnel à charge guidée (pile de poids) de la série Impulse IT95, conçu pour un usage intensif en salle",
  "Exoform": "appareil de musculation haut de gamme à charge guidée de la série Impulse Exoform (FE97), au design premium et à la biomécanique soignée",
  "IFP": "appareil semi-professionnel à charge additionnelle (disques) de la série Impulse IFP, simple d'utilisation et peu encombrant",
  "ITF": "équipement de charges libres de la série Impulse ITF8, raffiné, simple et durable",
  "ECP": "appareil de musculation à charge additionnelle (disques) de la série haut de gamme Impulse ECP",
  "SL": "appareil professionnel de la série Impulse SL, construit pour les charges lourdes et un usage intensif",
  "AC2": "tapis de course professionnel de la série Impulse AC, conçu pour un usage commercial",
  "AC4": "tapis de course professionnel de la série Impulse AC, conçu pour un usage commercial",
  "AC8": "tapis de course professionnel de la série Impulse AC, conçu pour un usage commercial",
  "RT": "tapis de course professionnel de la série Impulse RT, conçu pour durer en utilisation intensive",
  "PS": "vélo de spinning professionnel Impulse pour les cours collectifs et l'entraînement en salle",
  "ZONE": "station d'entraînement fonctionnel modulable de la gamme Impulse I-Zone",
  "MS": "module de la série Impulse Mega Space (MS), système de racks et d'accessoires combinables pour l'entraînement de force",
  "FF": "module de la série Impulse FF, système de rigs fonctionnels combinables (montants, bras, rangements, accessoires)",
}
