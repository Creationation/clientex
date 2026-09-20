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
| `npm run test` | tests unitaires Vitest : moteur de creneaux, fiches clients, mode demo |
| `npm run lint` | ESLint |

Avant de dire qu'une modification est terminee : `npm run test` puis
`npm run build`. Les deux doivent passer.

---

## 2. Variables d'environnement

Toutes documentees dans `.env.example`. `.env.local` est ignore par Git.

Deux fichiers **sont** versionnes, parce qu'ils ne contiennent aucun secret :
`.env.development` et `.env.production` ne portent que `VITE_SITE_URL`, le
domaine sur lequel le site est servi. Sans lui, `index.html` garderait le
litteral `%VITE_SITE_URL%` dans ses balises canonical et Open Graph.

| Variable | Role |
| --- | --- |
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | cle publique (anon). Exposee au navigateur, c'est normal : la securite repose sur la RLS |
| `VITE_SUPABASE_PROJECT_ID` | identifiant court, utilise par la CLI |
| `VITE_SITE_URL` | domaine public : lien canonique, Open Graph, JSON-LD, fichier `.ics` |

> **Au changement de domaine**, trois endroits a mettre a jour ensemble :
> `.env.production`, `public/sitemap.xml` et `public/robots.txt`. Les deux
> derniers sont copies tels quels par Vite, aucune substitution n'y est faite.

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
    admin/        vues calendrier, editeurs CRUD, fiche rendez-vous
                  (deplacer, annuler), creation manuelle, horaires et
                  absences par barbier, statistiques, fiches clients
    ui/           Reveal, SectionHead, Photo, Pill
    Header.tsx  Footer.tsx  FloatingActions.tsx  Seo.tsx
  contexts/       LanguageContext (DE / EN)
  data/           types, seed, fiche salon, textes legaux
  hooks/          useSalonData, useAdminAuth, useNextAvailability, useReveal
  i18n/           de.ts, en.ts (le type est derive de de.ts)
  lib/            db.ts (adaptateurs), slots.ts (moteur de creneaux),
                  pricing.ts (delai d'annulation), ics.ts,
                  supabase.ts, utils.ts, *.test.ts
  pages/          Landing, Booking, Confirmation, ManageBooking, Legal,
                  Admin, Tagesplan, NotFound
supabase/
  migrations/     schema, policies RLS, puis reservation v2
  functions/      create-booking, cancel-booking, send-booking-update,
                  process-reminders, send-booking-confirmation,
                  send-telegram-notification, _shared/email.ts
  seed.sql        donnees de demarrage
  cron.sql        planification des rappels (a executer a la main)
public/           manifest, icones, robots.txt, sitemap.xml, sw.js
  media/          video du hero, affiche et photos de la galerie
```

### Routes

| Route | Page |
| --- | --- |
| `/` | landing one-page, hero video |
| `/termin` | tunnel de reservation en 5 etapes, plusieurs prestations possibles |
| `/termin/bestaetigt` | confirmation avec export `.ics`, Google Agenda et lien de gestion |
| `/termin/verwalten/:token` | le client voit son rendez-vous et l'annule lui-meme dans le delai, sans compte |
| `/impressum` `/datenschutz` | mentions legales, obligatoires en Autriche |
| `/admin` | dashboard, e-mail + mot de passe |
| `/tagesplan` | plan du jour plein ecran pour la tablette du salon |

---

## 4. Base de donnees

### Tables

`services` · `barbers` · `barber_hours` · `barber_absences` · `opening_hours` ·
`settings` · `blocked_slots` · `bookings` · `booking_services` ·
`client_notes` · `admin_users`

Pas de table clients : les fiches (onglet Kunden) sont reconstruites depuis
`bookings`, regroupees par telephone normalise (`src/lib/clients.ts`). Seule la
note libre du salon est stockee, dans `client_notes`.

Un rendez-vous peut combiner plusieurs prestations : les lignes vivent dans
`booking_services`, et `bookings` porte les totaux (`duration_min`, `price`)
recalcules cote serveur.

### Ce que couvre la prise de rendez-vous (calquee sur sitdown-studio)

| Cote client | Cote salon |
| --- | --- |
| une ou plusieurs prestations, barbier libre ou "egal wer" | Tagesplan, semaine, liste, temps reel (Supabase Realtime) |
| prochain creneau libre affiche par barbier | creer un rendez-vous a la main (telephone, walk-in), sans delai minimum |
| brouillon restaure si le client quitte la page | deplacer un rendez-vous, le client recoit un e-mail |
| annulation par le client depuis son lien | annuler avec e-mail au client et Telegram au salon |
| lien de gestion secret : voir, ajouter au calendrier, annuler | horaires propres a chaque barbier et absences (conges) |
| annulation en ligne jusqu'a X heures avant, puis appel | statistiques : chiffre d'affaires, no-show, top prestations |
| rappels e-mail 24 h et 2 h avant | reglages des rappels et du delai d'annulation |
| reserver pour deux personnes (pere et fils), deux rendez-vous enchaines | Tagesplan en liste sur telephone, appel en un tap |
| "Nochmal buchen" : memes prestations, meme barbier, il ne reste que le jour | fiches clients : visites, derniere fois, prochain rendez-vous, note libre |
| e-mail "Danke" apres le rendez-vous, avec lien vers l'avis Google | resume du jour sur Telegram le matin |
| | recherche par nom / telephone, cloture automatique des rendez-vous passes |

**Pas de compte client**, contrairement a sitdown. Le lien de gestion
(`bookings.manage_token`, 48 caracteres hexadecimaux) joue ce role : il
n'ouvre que ce rendez-vous, et la fonction `booking_by_token()` ne renvoie
ni identifiant interne ni donnee d'un autre client.

### Jours feries

Le salon n'a pas le droit d'ouvrir un jour ferie : `src/lib/holidays.ts`
calcule les treize feries autrichiens (Paques compris) et le moteur de
creneaux, le badge "geoffnet", le Tagesplan et `create-booking` les traitent
comme un dimanche. Rien a saisir chaque annee.

### Rendez-vous d'exemple

`supabase/seed_examples.sql` remplit deux semaines de rendez-vous "(Beispiel)"
pour montrer le dashboard a Del. A retirer avant la mise en ligne :
`delete from public.bookings where client_name like '%(Beispiel)';`

### Le moteur de creneaux

`src/lib/slots.ts`, teste dans `slots.test.ts`. La plage de travail d'un
barbier est l'intersection des horaires du salon et de ses propres horaires
(`barber_hours`), vide s'il est absent (`barber_absences`). Un rendez-vous
bloque tout son intervalle plus le buffer. Pour "egal wer", un creneau est
libre des qu'un barbier actif est libre, et l'Edge Function affecte alors le
premier disponible.

La meme logique existe trois fois, volontairement : dans le navigateur
(affichage), dans le mode demo (`db.ts`) et dans `create-booking`
(decision). Le navigateur n'a jamais le dernier mot.

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

Deux tables ne sont jamais lues directement par le public, mais via une
fonction `SECURITY DEFINER` qui filtre :

- `barber_absences` : `list_absences()` cache le motif aux non-admins
- `bookings` : `booking_by_token()` pour le lien de gestion, `public_busy_slots()` pour les creneaux

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
supabase functions deploy cancel-booking
supabase functions deploy send-booking-update
supabase functions deploy process-reminders
supabase functions deploy send-daily-summary
supabase functions deploy send-booking-confirmation
supabase functions deploy send-telegram-notification
```

`supabase/config.toml` fixe `verify_jwt = false` partout sauf sur
`send-booking-update` (appelee par le dashboard avec le JWT de l'admin).
Les fonctions internes verifient elles-memes le bearer contre
`SUPABASE_SERVICE_ROLE_KEY`. Attention, piege rencontre le 20 septembre :
sur un projet recent, cette variable contient la cle **`sb_secret_...`**,
pas l'ancien JWT service_role. La passerelle refuse une cle `sb_secret` des
que `verify_jwt = true`, et l'API de gestion ne rend la valeur complete
qu'avec `?reveal=true`. C'est cette cle qu'il faut dans `cron.sql`.

| Fonction | Declencheur | Effet |
| --- | --- | --- |
| `create-booking` | formulaire public | valide, insere, Telegram + e-mail de confirmation |
| `cancel-booking` | lien de gestion du client | verifie le delai, annule, e-mail + Telegram |
| `send-booking-update` | dashboard (deplacer, annuler) | e-mail au client, Telegram au salon |
| `process-reminders` | pg_cron toutes les 30 min | rappels 24 h et 2 h, puis e-mail "Danke" 2 h apres le rendez-vous, une seule fois chacun |
| `send-daily-summary` | pg_cron a 07:30 (Vienne), lundi a samedi | resume du jour sur Telegram |
| `close_past_bookings()` (SQL) | pg_cron a 22:00 et a chaque ouverture du dashboard | rendez-vous confirmes et passes -> erledigt |

### Activer les rappels e-mail

1. Dashboard > Database > Extensions : activer `pg_cron` et `pg_net`
2. Ouvrir `supabase/cron.sql`, remplacer `<PROJECT_REF>` et
   `<SERVICE_ROLE_KEY>`, executer dans le SQL Editor
3. Les rappels se coupent depuis l'admin, onglet Offnungszeiten, sans toucher
   au cron

Le fichier n'est pas une migration parce qu'il contient la cle service role.

### Creer le bot Telegram

1. Ecrire a `@BotFather` sur Telegram, `/newbot`, recuperer le token
2. Ajouter le bot au groupe du salon, ou lui ecrire en direct
3. Recuperer le `chat_id` :
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. `supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...`

---

## 6. Deploiement Vercel

### Deploiement de demonstration

Le site tourne en **mode demo** tant qu'aucune variable Supabase n'est definie
cote Vercel : les donnees viennent du `localStorage` du visiteur. C'est exactement
ce qu'il faut pour montrer le site a un client, y compris depuis un telephone en
4G, sans backend et sans risque de polluer de vraies donnees.

- depot : `https://github.com/Creationation/clientex`, branche `main`
- projet Vercel : `clientex-two`
- rien a configurer : `vercel.json` fixe deja le framework, la commande de build,
  les reecritures SPA et les en-tetes de cache

#### Vercel affiche "No Deployment" apres un push

C'est l'etat constate le 3 septembre 2026 : le depot est bien pousse, le projet
`clientex-two` existe, mais aucun build ne se declenche et le domaine repond
`DEPLOYMENT_NOT_FOUND`. L'application GitHub de Vercel n'a pas acces au depot.
Deux facons de s'en sortir, au choix.

**Voie 1, retablir l'integration native (3 clics, rien a copier).**

1. GitHub > Settings > Applications > Vercel > Configure
2. Repository access : ajouter `Creationation/clientex`
3. Vercel > projet `clientex-two` > Settings > Git : verifier que le depot est
   connecte et que la branche de production est `main`

Le push suivant declenche le build. Pour ne pas attendre un commit :
Deployments > Redeploy.

**Voie 2, deployer depuis la CI (ne depend plus de l'application GitHub).**

`.github/workflows/deploy-vercel.yml` est deja en place. Il ne fait rien tant
que les secrets sont absents, et deploie a chaque push sur `main` des qu'ils
existent. Creer les trois secrets dans GitHub > Settings > Secrets and
variables > Actions :

| Secret | Ou le trouver |
| --- | --- |
| `VERCEL_TOKEN` | Vercel > Account Settings > Tokens > Create |
| `VERCEL_ORG_ID` | Vercel > Account Settings > General |
| `VERCEL_PROJECT_ID` | Vercel > projet `clientex-two` > Settings > General |

Puis Actions > Deploiement Vercel > Run workflow.

**Voie 3, un deploiement manuel tout de suite**, depuis ce poste :

```bash
npx vercel login      # ouvre le navigateur, a lancer soi-meme
npx vercel link       # choisir le projet clientex-two
npx vercel --prod
```

`vercel link` ajoute un `VERCEL_OIDC_TOKEN` dans `.env.local` et reecrit
`.gitignore` : retirer le jeton apres coup, il n'a rien a faire la.

> Note reprise du projet BubuMoney : Vercel n'attribue les commits que si
> l'adresse de l'auteur est verifiee sur le compte GitHub proprietaire du
> depot. Sans cela, l'integration Git reste capricieuse et la voie 2 est la
> plus sure.

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

**Logo.** L'embleme aux ciseaux ailes est place a gauche du nom, dans
l'en-tete, le pied de page, les pages internes, l'e-mail de confirmation, le
favicon, les icones PWA et l'image de partage. Il est servi en silhouette
monochrome : ivoire sur fond sombre, noir sur fond clair. Le rendu dore
d'origine devient illisible a 28 px de haut et jure avec la palette ; il reste
disponible dans `public/media/logo-gold.png` pour l'impression et la
signaletique. Le fichier source du client est archive dans `brand/`, avec le
detail des declinaisons dans `brand/README.md`.

Pour regenerer toutes les declinaisons apres un nouveau fichier source :
adapter le chemin en tete de `brand/README.md` et relancer le script de
preparation (silhouette extraite du canal alpha, donc aucun detourage manuel).

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
| `logo-*.png` | declinaisons du logo, generees, a ne pas editer a la main |

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
paiement Stripe, chatbot IA, programme de fidelite et codes promo (retires a la
demande du client), rappels SMS, build natif.

---

## 11. A confirmer avec le client

Les valeurs ci-dessous sont des hypotheses de travail, editables dans l'admin
et dans `supabase/seed.sql`.

- horaires : Lu-Ve 09:00-19:00, Sa 09:00-18:00, Di et feries fermes, pas de pause (confirme le 20 sept.)
- prestations : les 14 de la liste affichee en vitrine, prix reels. Les
  durees ne sont pas sur la liste : ce sont des estimations a valider
- delai d'annulation en ligne : 24 h par defaut
- lien "Bewertung schreiben" des e-mails de remerciement : `VITE_GOOGLE_REVIEW_URL`
  cote site et secret `GOOGLE_REVIEW_URL` cote fonctions, a remplacer par le lien
  court de la fiche Google Business (sinon, recherche Google Maps du salon)
- barbiers : Del (repos mardi) et Mustafa (repos mercredi), photos reelles
- Impressum : les lignes `[ZU ERGANZEN]` dans `src/data/legal.ts` doivent etre
  remplies (forme juridique, Firmenbuchnummer, UID, gerant) avant toute mise en
  ligne. C'est une obligation legale en Autriche.
- photos HD du salon, logo vectoriel, video du hero tournee sur place
- Instagram, domaine definitif, chat_id Telegram
