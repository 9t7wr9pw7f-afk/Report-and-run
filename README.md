# Réserves & Run 🏗️

Application web (PWA) de rapports photographiques de chantier, inspirée de **Report and Run**, enrichie pour les rapports de réserves / désordres :

- 📸 **Photos de réserves** : capture/import multiple, titres, descriptions, catégories
- 🖍️ **Annotations** : flèches, cercles, rectangles, croix, cochages, polygones, texte, dessin libre
- 🎨 **Filtres photo** : luminosité, contraste, saturation, teinte, netteté, recadrage
- 🗺️ **Plans interactifs** : import d'autant de plans que nécessaire (RDC, étages, façades…), épingles **numérotées** posées directement sur le plan, déplaçables, colorées selon le statut
- 🔍 **Recherche avancée** : statut, sous-traitant, section, priorité, plage de dates, mots-clés
- 📄 **Export PDF propre** : photos annotées regroupées par section, statut/priorité/responsable, numéro de repère, et le **plan annoté avec la légende numérotée** pour un repérage immédiat par les sous-traitants
- ☁️ / 💾 **Stockage** : IndexedDB hors-ligne par défaut, sync cloud optionnelle via Supabase

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre l'URL affichée (souvent http://localhost:5173). Enregistre la page sur l'écran d'accueil de ton iPhone/iPad pour une expérience plein écran (PWA).

## Construire pour la production

```bash
npm run build
```

Les fichiers statiques sont générés dans `dist/` — déployables sur n'importe quel hébergeur statique (Vercel, Netlify, Cloudflare Pages, GitHub Pages…).

## Stockage en ligne (Supabase)

Pour synchroniser les rapports dans le cloud et les retrouver sur tous tes appareils :

1. Crée un projet gratuit sur [supabase.com](https://supabase.com)
2. Dans l'éditeur SQL, exécute le contenu de [`supabase/schema.sql`](supabase/schema.sql)
3. Crée un fichier `.env` à la racine :

```
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta-cle-anon
```

4. Relance `npm run build` — l'app détecte la config et synchronise automatiquement chaque rapport à l'enregistrement.

> ⚠️ Avec la clé anonyme publique, les rapports sont disponibles via les liens partageables. Pour un accès restreint par utilisateur, active l'authentification Supabase et adapte les policies RLS.

## Installer sur iPhone (PWA)

1. Sur GitHub : dépôt → **Settings → Pages → Source : GitHub Actions** (workflow fourni dans `.github/workflows/deploy.yml`)
2. Ouvre `https://ton-compte.github.io/Report-and-run/` dans **Safari**
3. Bouton **Partager** → **Sur l'écran d'accueil** → l'app s'installe avec son icône, en plein écran, comme une app native

> Pour une version native distribuée sur l'App Store/TestFlight, un compte Apple Developer (99 $/an) et Xcode sont requis.

## Structure

- `src/App.tsx` — racine : liste des rapports / éditeur
- `src/ReportsList.tsx` — recherche et filtres avancés
- `src/ReportEditor.tsx` — édition d'un rapport (sections, réserves, métadonnées)
- `src/Annotator.tsx` — annotations et filtres photo
- `src/PlanEditor.tsx` — plans et épingles de repérage
- `src/render.ts` — rendu canvas des annotations et filtres
- `src/pdf.ts` — export PDF (jsPDF)
- `src/storage.ts` — IndexedDB + sync Supabase REST
- `supabase/schema.sql` — table et bucket de stockage

## Évolutions prévues

- App iOS native (React Native / SwiftUI) s'appuyant sur la même base Supabase
- Partage de liens en lecture seule par sous-traitant
- Commentaires et photos de contrepartie des sous-traitants
