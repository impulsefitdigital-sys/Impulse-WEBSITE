# Archive des demandes dans Google Sheets

Chaque demande du site (devis ou contact) est copiée dans un Google Sheet du client,
avec son suivi (statut, notes, montant, relance). Objectif : sécuriser l'information
hors du site. Aucun email n'est envoyé (automatisations prévues plus tard).

## Fonctionnement

```
Visiteur → formulaire → Supabase (contact_requests)
                           │ déclencheur (pg_net, côté serveur)
                           ▼
            Apps Script (Code.gs) → onglet « Demandes » du Google Sheet
```

- Nouvelle demande → nouvelle ligne. Modification dans l'admin → la ligne est mise à jour.
- Suppression dans l'admin → la ligne reste, statut « Supprimée du site ».
- L'adresse du script et la clé secrète sont stockées dans `private_settings`
  (lisible par l'admin uniquement) : rien n'est exposé dans le navigateur des visiteurs.
- Un problème d'envoi n'empêche jamais l'enregistrement de la demande sur le site ;
  le bouton « Renvoyer toutes les demandes » rattrape tout (sans doublon).

## Installation

1. Créer un Google Sheet **sur le compte Google du client**.
2. Extensions → Apps Script → coller `Code.gs`.
3. Admin → Paramètres → Intégrations → **Générer** une clé secrète, la coller dans
   `const SECRET = "…"` du script, enregistrer le script.
4. Déployer → Nouveau déploiement → type **Application Web** :
   exécuter en tant que **Moi**, accès **Tout le monde** → autoriser.
5. Copier l'URL `https://script.google.com/macros/s/…/exec` dans l'admin → Enregistrer
   → **Tester la connexion** → **Renvoyer toutes les demandes**.

Si le script est modifié plus tard : Déployer → Gérer les déploiements → modifier →
nouvelle version (l'URL reste la même).

## Prérequis Supabase

Migration `supabase/migrations/20260930120200_google_sheets.sql` (active l'extension
`pg_net`, disponible sur tous les projets Supabase).
