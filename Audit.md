# Elite Time – Audit technique Front & Sécurité

_Audit réalisé sur la base des dossiers `app`, `src`, `prisma` (Next.js App Router, React, Prisma/PostgreSQL, LDAP, WebSockets)._

---

## 1. Synthèse des notes

- **Sécurité (front + API + WebSockets)** : **8 / 10**
- **Architecture (code, structure, séparation front/server)** : **8 / 10**
- **Fonctionnement / Qualité du code** : **7.5 / 10**
- **Accessibilité** : **6 / 10**
- **Design / UX** : **8 / 10**

Globalement, l’application est **au-dessus de la moyenne** pour un projet d’entreprise :  
les fondations de sécurité et d’architecture sont solides, avec quelques points de dette et de divergence à corriger pour tendre vers un niveau “enterprise-grade” irréprochable.

---

## 2. Sécurité

### 2.1 Forces

- **[HTTP / Headers] [src/lib/security/headers.ts](cci:7://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/headers.ts:0:0-0:0)**
  - **Content-Security-Policy** explicite (CSP) : `default-src 'self'`, `frame-ancestors 'none'`, restrictions sur `img-src`, `font-src`, `connect-src` incluant `ws`/`wss`.
  - **Protection XSS / Clickjacking / MIME** :
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `X-XSS-Protection: 1; mode=block`
    - `Referrer-Policy: strict-origin-when-cross-origin`
  - **HSTS** activé conditionnellement en prod (`Strict-Transport-Security`).
  - **Rate limiting IP simple** côté middleware pour les API.
  - Wrapper [withSecurityHeaders(handler)](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/headers.ts:65:0-71:1) : permet de garantir que les APIs exposent les bons headers sans duplication.

- **[Auth & RBAC] [src/lib/security/rbac.ts](cci:7://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:0:0-0:0) + `src/lib/session.ts` + `/api/me` + `/api/login`**
  - **Session cookie sécurisé** :
    - `httpOnly: true`, `sameSite: 'lax'`, `secure` en prod, `path: '/'`.
  - **[getAuthenticatedUser](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:56:0-104:1)** :
    - Vérifie la présence du cookie `elitetime_session`.
    - Vérifie la session en BDD (Prisma) + expiration + `user.status === 'active'`.
    - Supprime les sessions expirées → limite l’accumulation.
  - **RBAC centralisé** :
    - [requireRole](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:106:0-117:1), `requireAdmin`, `requireManagerOrAdmin`, `requireEmployeeOrAbove`.
    - Fonctions de permissions : [hasUserPermission](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:246:0-261:1), [getUserPermissions](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:320:0-344:1), [requirePermission](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:280:0-298:1), [requirePermissionInCategory](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:300:0-318:1).
    - [validateUserAccess](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:140:0-186:1) / [canAccessUserData](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:124:0-138:1) : gestion fine d’IDOR (accès aux données d’autres utilisateurs).
  - **API login LDAP extrêmement soignée** :
    - Validation d’entrée (`LoginSchema` + `validateAndSanitize`).
    - **Rate limiting** par IP/username ([checkRateLimit](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:212:0-231:1), [markLoginAttempt](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:233:0-244:1), [logSecurityEvent](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:188:0-210:1)).
    - Config LDAP strict (TLS ≥ 1.2, `rejectUnauthorized` en prod).
    - **Échappement du filtre LDAP** pour éviter les injections.
    - Aucune fuite d’info sur l’existence des comptes (messages d’erreur génériques).
    - Logs d’activité (`createActivityLog`) + logs de sécurité ([logSecurityEvent](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:188:0-210:1)).
  - **Endpoint `/api/me`** :
    - Lit la session via `cookies()`, vérifie l’expiration et le status utilisateur.
    - Sélectionne explicitement les champs utilisateur, puis passe par `sanitizeUser`.

- **[WebSockets] [src/lib/security/websocket.ts](cci:7://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/websocket.ts:0:0-0:0)**
  - Authentification Socket.io basée sur la même **session en base** que le HTTP (`sessionToken`).
  - Vérification expiration + statut `active` avant d’attacher `userId`, `userRole`, `username`.
  - [authorizeSocket(requiredRoles)](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/websocket.ts:102:0-110:1) pour filtrer par rôle.
  - Validation stricte des payloads ([validateLateAlertPayload](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/websocket.ts:74:0-87:1), [validatePointagePayload](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/websocket.ts:89:0-100:1)).
  - `secureCorsOptions` alignés sur `ALLOWED_ORIGINS` (prod) et sur `localhost` en dev.
  - Rooms par rôle (`ROLE_ROOMS`) + [joinRoleRooms](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/websocket.ts:150:0-167:1) pour un broadcast ciblé.

- **[Navigation sécurisée] [navigation-registry.ts](cci:7://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/navigation-registry.ts:0:0-0:0) + [navigation-guard.ts](cci:7://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/navigation-guard.ts:0:0-0:0)**
  - Registre central des routes de navigation avec `allowedRoles` / `requiredPermissions`.
  - [requireNavigationAccessByPath](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/navigation-guard.ts:24:0-46:1) / [requireNavigationAccessById](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/navigation-guard.ts:16:0-22:1) :
    - Authentifie l’utilisateur.
    - Pour chaque chemin, combine :
      - Les règles du registry (code).
      - Les règles en base (`page.allowedRoles`, `pagePermissions`).
    - Si aucune candidate autorisée → [AuthorizationError('Permission requise')](cci:2://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:49:0-54:1).

### 2.2 Faiblesses / Points à améliorer

- **[CSP] `script-src` trop permissif en production**  
  - Actuellement : `'unsafe-inline' 'unsafe-eval'` autorisés (au moins partiellement justifié pour le dev).
  - **Risque** : XSS facilité si une injection de script est possible ailleurs.
  - **Recommandation** : prévoir une CSP stricte en prod (sans `unsafe-inline` / `unsafe-eval`) et garder la version permissive uniquement en dev.

- **[Typing des rôles]**
  - Certains endroits utilisent `string[]` pour les rôles (ex : `PageRules.allowedRoles?: string[]`, [authorizeSocket(requiredRoles: string[])](cci:1://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/websocket.ts:102:0-110:1)) alors que le modèle Prisma a un enum [UserRole](cci:2://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/navigation-registry.ts:13:0-13:38).
  - **Risque** : faute de frappe (ex: `"manger"` au lieu de `"manager"`) non détectée par TypeScript.
  - **Recommandation** : remplacer par [UserRole[]](cci:2://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/navigation-registry.ts:13:0-13:38) partout.

- **[sanitizeUser] `src/lib/session.ts`**
  - `export type SafeUser = User;` + `sanitizeUser` retourne l’objet `User` tel quel.
  - Aujourd’hui le modèle `User` ne contient pas de mot de passe (auth LDAP), donc ce n’est pas un problème direct.
  - **Risque futur** : si des champs sensibles sont ajoutés au modèle, ils seront exposés par défaut.
  - **Recommandation** : définir un type `SafeUser` réduit (id, username, nom/prénom, rôle, etc.) et mapper explicitement.

**Note Sécurité : 8 / 10**  
Bon niveau global, bonnes pratiques LDAP / sessions / RBAC / WebSockets.  
Les principaux axes d’amélioration sont le durcissement CSP prod et l’homogénéisation des types de rôles / SafeUser.

---

## 3. Architecture (front + back)

### 3.1 Forces

- **[Next.js App Router]**
  - `app/layout.tsx` propre : métadonnées, fonts, contextes globaux (`ThemeProvider`, `AuthProvider`, `NotificationProvider`, `RealtimeProvider`).
  - `app/(app)/dynamic-layout.tsx` : layout dédié pour l’espace applicatif, incluant la `DynamicSidebar`.
  - Organisation claire des features : `src/features/employee/*`, `src/features/manager/*`, `src/features/admin/*`.

- **[Contextes & providers]**
  - `AuthProvider` : gestion centralisée de l’état utilisateur côté client (`/api/me`, `/api/login`, `/api/logout`).
  - `NotificationProvider`, `RealtimeProvider` : découplage des responsabilités (toasts, WebSockets).

- **[Séparation responsabilités]**
  - `src/lib/security/*` pour la sécurité.
  - `src/lib/navigation-*` pour la navigation (registre + guard).
  - `src/actions/*` pour les server actions (admin, logs, etc.).
  - `prisma/schema.prisma` propre, bien structuré, avec relations et enums.

- **[Prisma / Modèle de données]**
  - Modèle cohérent pour un système de temps de travail :
    - `User`, `Pointage`, `Break`, `Absence`, `CorrectionRequest`, `ActivityLog`, `Session`, [UserPermission](cci:2://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/security/rbac.ts:32:0-39:1), `Page`, etc.
  - Utilisation des `enum` (UserRole, UserStatus, PointageStatus, etc.) → renforce la cohérence métier.

### 3.2 Faiblesses / améliorations

- **Divergence possible entre `DynamicSidebar` et `navigation-registry`**
  - La sidebar actuelle construit son propre menu à partir de listes locales (`baseEmployeeMenu`, `permissionBasedMenu`).
  - **Le `navigation-registry` contient une autre définition des éléments de navigation** avec `allowedRoles`/permissions.
  - **Risque** : en ajoutant une nouvelle page, on doit mettre à jour à deux endroits → incohérences possibles (UI vs règles serveur).
  - **Recommandation** : utiliser le `navigationRegistry` comme **source de vérité unique** pour le menu, filtré par rôle + permissions côté client.

**Note Architecture : 8 / 10**  
Structure globalement saine, modulaire, avec une bonne séparation des préoccupations. Le principal point à résoudre est la duplication de la définition des menus.

---

## 4. Fonctionnement & Qualité du code

### 4.1 Points positifs

- **Linting propre** (tu as réglé les erreurs ESLint, il reste essentiellement des warnings d’imports non utilisés).
- **Respect des règles React 19** (purity Hooks : suppression de `Math.random` dans les renders, fix des deps `useEffect`).
- **Typage TypeScript globalement bon** :
  - Très peu de `any`, usage des types générés Prisma, interfaces pour les contextes, etc.
- **Gestion des erreurs côté API** :
  - Messages génériques côté client, logs détaillés côté serveur.
  - Séparation claire entre erreurs d’authentification et erreurs système.

### 4.2 Points à surveiller

- **Variables/imports non utilisés** :
  - Ce n’est pas bloquant, mais cela ajoute du bruit et masque parfois de vrais problèmes.
- **Couplage modéré côté client** :
  - Le client dépend de plusieurs endpoints `/api/*` + contexte auth + WebSockets.
  - Globalement maîtrisé, mais à surveiller si de nouvelles features arrivent sans centraliser.

**Note Fonctionnement / Qualité : 7.5 / 10**  
Très propre pour un projet de cette taille, quelques dettes mineures à nettoyer régulièrement.

---

## 5. Accessibilité

### 5.1 Points positifs

- **Page de login bien structurée** :
  - Usage correct de `Label` + `Input` avec `htmlFor` / `id`.
  - Bouton de visibilité du mot de passe avec `aria-label` explicite.
  - Indicateur Caps Lock textuel (`La touche majuscule est activée.`).

- **Composants UI shadcn-like** (Button, Input, Card, etc.)  
  → généralement conçus avec une accessibilité de base correcte.

### 5.2 Points à améliorer

- **Manque de balises landmarks explicites** dans les pages (au-delà du layout global).
- **Focus management / skip links** :
  - Pas de mention de “skip to content”.
  - Non visible dans le code que les focus states ont été pensés pour le clavier.
- **Contrastes / modes** :
  - Le design semble soigné, mais sans tests explicites de contraste (WCAG AA).

**Note Accessibilité : 6 / 10**  
Correct mais perfectible. Tu as les briques techniques pour faire mieux, il manque une vraie passe d’audit a11y (clavier, lecteur d’écran, contraste).

---

## 6. Design & UX

### 6.1 Points positifs

- **Page de login** très travaillée :
  - Fond dégradé, blur, animation légère.
  - Indicateurs d’état (loading, Caps Lock, feedback de succès/erreur).
- **Sidebar dynamique** :
  - Clair, icônes, libellés explicites.
  - État actif bien mis en valeur (highlight, bordure, badge).
- **Cohérence visuelle** :
  - Utilisation homogène des composants UI (`Card`, `Badge`, `Button`, etc.).
  - Thème global via `ThemeProvider`.

### 6.2 Axes d’amélioration

- **Réutilisation du `navigationRegistry` pour la cohérence UX** :
  - Avoir le même ordre/grouping entre registry et sidebar.
- **Onboarding / feedback** :
  - Pour certaines pages complexes (pointages, rapports), prévoir des descriptions / empty states plus pédagogiques.

**Note Design / UX : 8 / 10**  
Très bon niveau pour une app interne : moderne, lisible, avec un bon usage des composants.

---

## 7. Recommandations prioritaires

- **Sécurité**
  - **Durcir la CSP en production** (supprimer `unsafe-inline/unsafe-eval` si possible).
  - Homogénéiser les types de rôle ([UserRole](cci:2://file:///c:/Users/UT08RM/Documents/Web%20Apps/elitetime/src/lib/navigation-registry.ts:13:0-13:38) partout, pas de `string[]` libres).
  - Rendre `SafeUser` réellement “safe” (projection explicite des champs).

- **Architecture / Navigation**
  - **Unifier le menu** : faire dériver `DynamicSidebar` du `navigationRegistry` pour éviter les divergences.
  - Continuer à utiliser `navigation-guard` comme unique référence serveur pour l’autorisation.

- **Accessibilité**
  - Ajouter des landmarks ARIA (`<main>`, `<nav>`, etc.).
  - Prévoir des tests manuels clavier + lecteurs d’écran pour les pages critiques (login, dashboard, pointages).

- **Qualité continue**
  - Maintenir `pnpm lint .` **sans erreurs** dans CI.
  - Faire une passe régulière pour supprimer les imports/variables morts.

---

## 8. Conclusion

L’application Elite Time est **bien au‑dessus de la moyenne** pour un projet d’entreprise :

- Fondations de **sécurité** et **auth LDAP** robustes.  
- Architecture **claire et extensible** (App Router, RBAC, registry de navigation, Prisma propre).  
- UX et design **modernes** avec un bon niveau de soin.

Les points à travailler sont surtout de l’ordre :

- Du **durcissement fin** (CSP, SafeUser, types de rôles).  
- De la **cohérence** (menu client vs registry serveur).  
- D’une **vraie passe accessibilité**.

Avec ces ajustements, tu peux viser un niveau “production critique” très solide.