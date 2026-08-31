# DEL Herren Friseur Barber Shop

Site vitrine et systeme de reservation du salon **DEL Herren Friseur Barber Shop**,
Erzherzog-Karl-Strasse 60, 1220 Wien.

React 18 · TypeScript · Vite · Tailwind · Supabase (Postgres, Auth, Edge Functions, RLS)
Resend pour les e-mails · Telegram Bot API pour les notifications · Vercel pour le deploiement.

---

## 1. Demarrage rapide

```bash
npm install
cp .env.example .env.local   # facultatif, voir le mode demo ci-dessous
npm run dev                  # http://localhost:5180
```

### Mode demo

Tant que `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ne sont pas
renseignes, l'app tourne en **mode demo** : les services, barbiers, horaires et
reservations viennent du `localStorage`, alimentes par `src/data/seed.ts`.

Tout est utilisable dans ce mode, y compris le tunnel de reservation complet,
le Tagesplan et l'admin. Les e-mails et les notifications Telegram ne partent
evidemment pas.

**Acces admin en mode demo** (defini dans `SEED_ADMIN`, `src/data/seed.ts`) :

```
renardiego@gmail.com
DelHerren2026!
```

Pour repartir de donnees fraiches : vider le `localStorage` du domaine, ou
appeler `resetDemoData()` depuis `src/lib/db.ts`.

### Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de developpement sur le port 5180 |
| `npm run build` | typecheck TypeScript puis build de production dans `dist/` |
| `npm run preview` | sert le build de production en local |
| `npm run lint` | ESLint |

---

## 2. Variables d'environnement

Toutes documentees dans `.env.example`. `.env.local` est ignore par Git.

| Variable | Role |
| --- | --- |
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | cle publique (anon). Exposee au navigateur, c'est normal : la securite repose sur la RLS |
| `VITE_SUPABASE_PROJECT_ID` | identifiant court, utilise par la CLI |
| `VITE_SITE_URL` | domaine public, utilise par le JSON-LD et les liens canoniques |

Secrets **cote serveur uniquement**, jamais dans le repo :

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set BOOKING_FROM_EMAIL="DEL Herren <termin@delherren.app>"
supabase secrets set TELEGRAM_BOT_TOKEN=123456:AAxxxx
supabase secrets set TELEGRAM_CHAT_ID=-1001234567890
# optionnels, pour notifier plusieurs personnes
supabase secrets set TELEGRAM_CHAT_ID_2=...
supabase secrets set TELEGRAM_CHAT_ID_3=...
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectes automatiquement dans
les Edge Functions par Supabase, il n'y a rien a faire.

---

## 3. Structure

```
src/
  components/
    sections/     Hero, Services, Team, Gallery, Hours, Contact, Marquee
    admin/        vues calendrier, editeurs CRUD, primitives partagees
    ui/           Reveal, SectionHead, Photo, Pill
    Header.tsx  Footer.tsx  FloatingActions.tsx  Seo.tsx
  contexts/       LanguageContext (DE / EN)
  data/           types, seed, fiche salon, textes legaux
  hooks/          useSalonData, useAdminAuth, useReveal
  i18n/           de.ts, en.ts (le type est derive de de.ts)
  lib/            db.ts (adaptateurs), slots.ts (moteur de creneaux),
                  ics.ts, supabase.ts, utils.ts
  pages/          Landing, Booking, Confirmation, Legal, Admin,
                  Tagesplan, NotFound
supabase/
  migrations/     schema puis policies RLS
  functions/      create-booking, send-booking-confirmation,
                  send-telegram-notification
  seed.sql        donnees de demarrage
public/           manifest, icones, robots.txt, sitemap.xml, sw.js
  media/          video du hero, affiche et photos de la galerie
```

### Routes

| Route | Page |
| --- | --- |
| `/` | landing one-page, hero video |
| `/termin` | tunnel de reservation en 5 etapes, plusieurs prestations possibles |
| `/termin/bestaetigt` | confirmation avec export `.ics` et Google Agenda |
| `/impressum` `/datenschutz` | mentions legales, obligatoires en Autriche |
| `/admin` | dashboard, e-mail + mot de passe |
| `/tagesplan` | plan du jour plein ecran pour la tablette du salon |

---

## 4. Base de donnees

### Tables

`services` · `barbers` · `opening_hours` · `settings` · `blocked_slots` ·
`bookings` · `booking_services` · `admin_users`

Un rendez-vous peut combiner plusieurs prestations : les lignes vivent dans
`booking_services`, et `bookings` porte les totaux (`duration_min`, `price`)
recalcules cote serveur.

### Deux garde-fous a ne jamais retirer

1. **Contrainte d'exclusion sur `bookings`.**
   ```sql
   exclude using gist (barber_id with =, period with &&)
     where (status <> 'cancelled')
   ```
   `period` est une colonne generee (`tsrange` du debut a la fin du rendez-vous).
   Deux rendez-vous qui se chevauchent chez le meme barbier sont refuses par
   Postgres, meme en cas de double clic simultane. Le code applicatif verifie
   aussi, mais c'est la base qui a le dernier mot.

2. **Aucun `INSERT` public sur `bookings`.**
   Le navigateur ne peut pas ecrire dans la table. Il appelle l'Edge Function
   `create-booking`, qui relit le prix et la duree depuis la base, revalide les
   horaires, affecte un barbier si le client a choisi "egal wer", puis ecrit
   avec la service role.

Les creneaux occupes sont exposes au public par la fonction
`public_busy_slots(p_from, p_to)`, qui ne renvoie que des intervalles horaires,
jamais un nom, un e-mail ou un telephone.

### Policies RLS

Chaque table a ses quatre verbes ecrits explicitement dans
`supabase/migrations/*_rls_policies.sql`. Les deux seules absences sont
volontaires et commentees dans le fichier :

- `settings` n'a pas de policy `DELETE` : c'est un singleton `id = 1`
- `bookings` n'a pas de policy `INSERT` pour `anon` : tout passe par l'Edge Function

---

## 5. Appliquer les migrations

### Premiere mise en place

```bash
npm i -g supabase                  # ou npx supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push                   # applique supabase/migrations/
psql "$DB_URL" -f supabase/seed.sql # ou : coller le contenu dans le SQL Editor
```

### Comptes admin

Chaque membre du salon a son propre e-mail et son propre mot de passe.
Supabase Auth gere le mot de passe, la table `admin_users` donne le droit
d'ouvrir le dashboard. Les deux sont necessaires.

**Premier compte (deja prevu dans le seed) :**

1. Supabase Dashboard, Authentication, Users, Add user
   e-mail `renardiego@gmail.com`, mot de passe au choix, cocher Auto confirm
2. Executer `supabase/seed.sql` : il rattache ce compte a `admin_users`

**Comptes suivants :** onglet "Zugange" du dashboard. Le compte doit d'abord
exister dans Auth ; le bouton appelle la fonction `grant_admin(email, nom)`,
qui verifie que l'appelant est deja admin avant d'accorder l'acces.

En mode demo, les comptes et leurs mots de passe vivent dans le `localStorage`
et se gerent depuis le meme onglet.

### Deployer les Edge Functions

```bash
supabase functions deploy create-booking
supabase functions deploy send-booking-confirmation
supabase functions deploy send-telegram-notification
```

`supabase/config.toml` fixe deja `verify_jwt = false` sur `create-booking`
(appelee par le navigateur) et `true` sur les deux autres (internes).

### Creer le bot Telegram

1. Ecrire a `@BotFather` sur Telegram, `/newbot`, recuperer le token
2. Ajouter le bot au groupe du salon, ou lui ecrire en direct
3. Recuperer le `chat_id` :
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. `supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...`

---

## 6. Deploiement Vercel

1. Importer le repo dans Vercel
2. Framework preset : Vite. Build `npm run build`, output `dist`
3. Renseigner les quatre variables `VITE_*` dans Project Settings, Environment Variables
4. Ajouter une reecriture SPA (`vercel.json` fourni) pour que `/termin` et
   `/impressum` fonctionnent au rechargement direct
5. Brancher le domaine `delherren.app`, puis verifier ce domaine dans Resend

---

## 7. SEO et PWA

- meta description, canonical, Open Graph et Twitter Card dans `index.html`
- `<meta name="google" content="notranslate">` : le site fournit deja DE et EN,
  et Google Translate injecte des balises `<font>` qui empechent React de mettre
  a jour les textes dynamiques (recapitulatif, creneaux, compteur d'etapes)
- JSON-LD `HairSalon` + `LocalBusiness` genere dans `src/components/Seo.tsx`,
  alimente par les horaires reels de la base, avec `aggregateRating` (4,9 / 256)
  et une `ReserveAction` vers `/termin`
- `public/sitemap.xml` et `public/robots.txt` (`/admin` exclu de l'indexation)
- `public/manifest.webmanifest` + icones SVG + `sw.js` (app shell en cache,
  enregistre uniquement en production pour ne pas gener le HMR)

---

## 8. Application native

`capacitor.config.ts` est pret (`appId: at.delherren.app`) mais **volontairement
non construit** en phase 1. Quand le domaine de production sera actif :

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## 9. Direction visuelle et medias

**Palette.** Fond ivoire chaud (`--paper`), noir chaud pour les blocs sombres
(`--carbon`), un seul accent bronze patine (`--brass`) en petites doses. Pas
d'or sature, pas de degrade metallique : le contraste vient du contenu et de
la photo, pas de la couleur.

**Typographie.** Fraunces pour les titres (serif optique, pleins solides a
toutes les tailles) et Manrope pour le texte courant. Le premier essai en
Bodoni Moda a ete abandonne : ses delies disparaissent a l'ecran.

**Formes.** Boutons en pilule, cartes arrondies, motif d'arche repris des
miroirs du salon.

**Langues.** Allemand par defaut, anglais en second. Le selecteur affiche de
vrais drapeaux servis par `flagcdn.com` (Autriche pour l'allemand, Royaume-Uni
pour l'anglais) plutot que des emojis, dont le rendu est inegal sur Windows.

### Medias temporaires

`public/media/` contient une video de hero et sept photos issues de la banque
libre **Mixkit** (licence gratuite, usage commercial autorise, sans
attribution). Elles servent de placeholders.

**A remplacer avant la mise en ligne** par les vraies images du salon :

| Fichier | Usage |
| --- | --- |
| `hero-barber.mp4` / `hero-barber-mobile.mp4` | fond video du hero |
| `hero-poster.jpg` | affiche affichee avant le chargement de la video |
| `salon-1..7.jpg` | galerie et photos des barbiers |
| `craft.jpg` | visuel de la section Salon |

Les chemins sont centralises dans `MEDIA` et `GALLERY` (`src/data/seed.ts`),
et la photo de chaque barbier est editable dans l'admin.

Pour reencoder une nouvelle video de hero :

```bash
ffmpeg -i source.mp4 -t 13 -an -vf "scale=1600:-2,format=yuv420p" \
  -c:v libx264 -crf 31 -preset slow -movflags +faststart \
  public/media/hero-barber.mp4
```

---

## 10. Hors scope phase 1

L'architecture les accueille sans refonte, ils ne sont pas construits :
paiement Stripe, chatbot IA, programme de fidelite, collecte d'avis
automatisee, rappels SMS, build natif.

---

## 11. A confirmer avec le client

Les valeurs ci-dessous sont des hypotheses de travail, editables dans l'admin
et dans `supabase/seed.sql`.

- horaires : Lu-Ve 09:00-19:00, Sa 09:00-18:00, Di ferme
- prestations : 9 services, durees et prix estimes
- barbiers : 3 (Ali, Mehmet, Serkan), photos de placeholder
- Impressum : les lignes `[ZU ERGANZEN]` dans `src/data/legal.ts` doivent etre
  remplies (forme juridique, Firmenbuchnummer, UID, gerant) avant toute mise en
  ligne. C'est une obligation legale en Autriche.
- photos HD du salon, logo vectoriel, video du hero tournee sur place
- Instagram, domaine definitif, chat_id Telegram
