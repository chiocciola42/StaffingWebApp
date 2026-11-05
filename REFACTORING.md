# REFACTORING.md — Backlog di refactoring (App + Database)

> **Cos'è questo file.** Analisi strutturata e *actionable* dei refactoring ad alto
> valore per l'applicazione **e** per il database. È pensato per essere consumato
> direttamente con l'istruzione **GOAL**: ogni voce è una unità di lavoro atomica,
> con problema, evidenza (`file:riga`), proposta, file impattati, rischio, passi di
> verifica e criteri di accettazione.
>
> **Analisi generata il 2026-07-21** su commit del branch `claude/code-refactor-analysis-cbv1yn`.
> Nessun codice è stato modificato durante l'analisi (solo lettura).

---

## GOAL

```
GOAL: Eseguire i refactoring elencati in REFACTORING.md, uno alla volta, in ordine
di priorità (P0 → P3), mantenendo INVARIATO il comportamento funzionale
dell'applicazione.

REGOLE:
1. Un task per volta. Prendere il primo task non spuntato con priorità più alta.
2. Prima di iniziare: assicurarsi che la baseline sia VERDE (vedi "Gate di verifica").
3. Applicare SOLO la modifica descritta nel task. Nessun cambiamento di scope.
4. Dopo la modifica: eseguire TUTTI i gate di verifica. Devono restare verdi.
5. Se un gate fallisce e la causa non è banale: FERMARSI e ri-pianificare, non forzare.
6. Spuntare il task ([x]), aggiornare "Log avanzamento" con data + esito, committare
   con messaggio descrittivo che cita l'ID del task (es. "DB-01: indici su FK").
7. Un task è "fatto" solo quando i suoi Criteri di accettazione sono dimostrati.
```

### Gate di verifica (devono restare VERDI dopo ogni task)

```bash
npm run typecheck   # tsc --noEmit → 0 errori
npm run test        # vitest → tutti verdi (nessuna perdita di copertura)
npm run lint        # eslint --max-warnings 0 → 0 warning
npm run build       # tsc + vite build → build OK
```

Regola d'oro: **mai** spuntare un task se anche uno solo dei gate è rosso.

### Matrice di priorità

| Priorità | Significato | Quando affrontarli |
|---|---|---|
| **P0** | Correttezza / sicurezza / drift che può rompere prod | Subito |
| **P1** | Alto valore: performance DB, robustezza, debito strutturale | Dopo i P0 |
| **P2** | Manutenibilità: duplicazione, tipi, file grandi | Continuo |
| **P3** | Migliorie opzionali / igiene | Quando c'è margine |

---

## Parte 1 — Database

### DB-01 — [P0] Il bootstrap dello schema NON crea la tabella `wbs_tasks`

- [ ] **Problema.** `wbs_tasks` è un'entità gestita a tutti gli effetti (è in
  `ALL_MANAGEABLE_ENTITIES`, viene letta in `api/data.ts`, esposta nella visibility
  RBAC e nel seed viene inclusa nel `TRUNCATE`), ma **`ensureDbTablesExist()` non
  contiene alcun `CREATE TABLE wbs_tasks`**. L'unico DDL della tabella vive dentro
  la stringa di dump di `api/export.ts` (che genera SQL, non lo esegue sul DB vivo).
  Su un database inizializzato solo tramite `ensureDbTablesExist`, ogni operazione
  su `wbs_tasks` fallisce con *relation does not exist*.
- **Evidenza.** `api/_lib/schema.ts` (nessun `CREATE TABLE wbs_tasks`); DDL presente solo in `api/export.ts:44`; referenziata in `api/_lib/auth.ts` (`ALL_MANAGEABLE_ENTITIES`), `api/_lib/resourcesConfig.ts`, `api/data.ts`, `scripts/seed.js` (TRUNCATE).
- **Proposta.** Aggiungere il `CREATE TABLE IF NOT EXISTS wbs_tasks (...)` in `api/_lib/schema.ts`, riusando esattamente la definizione già presente in `export.ts` (stessa lista colonne/vincoli), così che il dump e lo schema vivo coincidano.
- **File impattati.** `api/_lib/schema.ts`.
- **Rischio.** Basso (aggiunta idempotente `IF NOT EXISTS`).
- **Verifica.** Gate standard + verificare che una GET su `wbs_tasks` non dia più errore su un DB fresco.
- **Accettazione.** La definizione di `wbs_tasks` esiste in un'unica fonte (`schema.ts`) e `export.ts` la referenzia/riusa invece di duplicarla.

### DB-02 — [P0] `scripts/seed.js` è in drift con lo schema (`horizontals`/`horizontal`)

- [ ] **Problema.** Lo schema è stato migrato da `horizontals` → `functions` e da
  `resources.horizontal` → `resources.function` (vedi migrazioni in `schema.ts:17,22,48`).
  Il seed invece usa ancora la **vecchia** nomenclatura: `INSERT INTO horizontals`
  e `INSERT INTO resources (... horizontal ...)`. Su uno schema aggiornato,
  `npm run seed` fallisce (tabella/colonna inesistente). Inoltre il seed fa
  `TRUNCATE ... horizontals ...` di una tabella che lo schema non crea più.
- **Evidenza.** `scripts/seed.js:44,51,95` vs `api/_lib/schema.ts:17,22,48`.
- **Proposta.** Allineare il seed alla nomenclatura corrente (`functions` / `function`),
  e togliere `horizontals` dal `TRUNCATE`. Idealmente far girare il seed **dopo**
  `ensureDbTablesExist` (vedi DB-03) così condivide la stessa fonte di verità.
- **File impattati.** `scripts/seed.js`.
- **Rischio.** Basso, ma va testato con `npm run seed` su un DB reale/di test.
- **Accettazione.** `npm run seed` gira idempotente su uno schema prodotto da `ensureDbTablesExist` senza errori.

### DB-03 — [P1] Unificare le QUATTRO fonti di verità dello schema

- [ ] **Problema.** Lo schema del DB è definito/duplicato in **tre** posti che
  possono divergere (e già divergono, vedi DB-01/DB-02):
  1. `api/_lib/schema.ts` — DDL runtime (fonte "vera")
  2. `api/export.ts` — DDL rigenerato a mano per il dump
  3. `scripts/seed.js` — assume tabelle + colonne
  Ogni nuova colonna va aggiornata in 3 punti: fonte primaria di bug di drift.
- **Evidenza.** `api/_lib/schema.ts`, `api/export.ts:40-60`, `scripts/seed.js`.
- **Proposta.** Estrarre un modulo unico `api/_lib/schemaDefinition.ts` che descrive
  tabelle e colonne come dati (array di DDL o metadati), consumato da: `schema.ts`
  (esecuzione), `export.ts` (dump), `seed.js` (via import).
- **File impattati.** nuovo `api/_lib/schemaDefinition.ts`, `api/_lib/schema.ts`, `api/export.ts`, `scripts/seed.js`.
- **Rischio.** Medio (tocca il bootstrap). Fare a piccoli passi, un consumatore alla volta.
- **Accettazione.** Il DDL esiste in un solo file; `export.ts` e `schema.ts` producono la stessa struttura tabellare (verificabile con un test di snapshot).

### DB-04 — [P1] Nessun indice sul database (query su `allocations` a rischio full-scan)

- [ ] **Problema.** Lo schema **non definisce alcun indice** oltre alle PRIMARY KEY.
  Le colonne di *foreign key* e i campi filtrati di frequente non sono indicizzati.
  Caso critico: `allocations` è la tabella più grande (una riga per assegnazione×giorno)
  e viene interrogata per **intervallo di date** (`WHERE allocation_date >= $1 AND
  allocation_date <= $2`) senza alcun indice su `allocation_date` (la PK è
  `(assignment_id, allocation_date)`, quindi inutile per un filtro solo-data).
- **Evidenza.** `grep "CREATE INDEX"` → 0 risultati; `api/data.ts:226` (query per range date); PK in `api/_lib/schema.ts:126`.
- **Proposta.** Aggiungere indici mirati in `schema.ts` (idempotenti, `CREATE INDEX IF NOT EXISTS`):
  - `allocations(allocation_date)` — filtro per range nel bulk fetch
  - FK ad alta cardinalità: `assignments(resource_id)`, `assignments(project_id)`, `projects(client_id)`, `projects(contract_id)`, `resources(role_id)`, `leave_requests(resource_id)`, `resource_requests(project_id)`, `resource_skills(skill_id)`, `action_logs(created_at)`, `notifications(recipient_resource_id)`.
- **File impattati.** `api/_lib/schema.ts`.
- **Rischio.** Basso (indici additivi, `IF NOT EXISTS`). Impatto solo su spazio/scrittura, trascurabile a queste dimensioni.
- **Accettazione.** Gli indici esistono; `EXPLAIN` sulla query di `data.ts:226` non fa più Seq Scan sulla tabella allocazioni.

### DB-05 — [P1] Migrazioni e DDL eseguiti nel percorso di richiesta (`ensureDbTablesExist`)

- [ ] **Problema.** `ensureDbTablesExist` mescola `CREATE TABLE`, `ALTER TABLE ... ADD
  COLUMN`, `RENAME COLUMN`, `UPDATE` di migrazione e `INSERT` di seed, e viene
  invocata **in linea nel handler**. Peggio: in `api/resources.ts:298` è chiamata
  **ad ogni richiesta senza guardia**, mentre `api/data.ts:52` usa correttamente un
  flag di modulo (`isSchemaInitialized`). Incoerenza + costo per richiesta + rischio
  che una migrazione fallita (con `catch` silenziosi) lasci lo schema a metà.
- **Evidenza.** `api/resources.ts:298` (nessuna guardia) vs `api/data.ts:52` (guardia); `catch` vuoti/silenziosi in `api/_lib/schema.ts:23,49,56,73,117`.
- **Proposta.** Due passi indipendenti:
  1. **Immediato:** aggiungere in `resources.ts` la stessa guardia `isSchemaInitialized` di `data.ts`, estraendola in un helper condiviso (`api/_lib/schema.ts` esporta `ensureDbTablesExistOnce`).
  2. **Strutturale:** separare la creazione schema (DDL idempotente) dalle *migrazioni* versionate; spostare le migrazioni in uno script `npm run migrate` eseguito in deploy, non a runtime.
- **File impattati.** `api/_lib/schema.ts`, `api/resources.ts`, `api/data.ts`.
- **Rischio.** Basso per il passo 1; medio per il passo 2 (cambia il ciclo di deploy — pianificare a parte).
- **Accettazione.** Lo schema è inizializzato una sola volta per processo; nessun handler chiama il DDL incondizionatamente.

### DB-06 — [P1] SQL dinamico non parametrizzato nel `db_inspector`

- [ ] **Problema.** L'endpoint admin `db_inspector` costruisce SQL per interpolazione
  di stringhe. Il nome tabella è validato contro una whitelist, ma:
  - in `update_row` i **nomi di colonna** (`${k}`) sono interpolati **senza validazione** → SQL injection tramite chiavi del body;
  - `run_raw_query` esegue SQL arbitrario passato dal client.
  Anche se protetto da `verifyAdmin`, è una superficie di rischio elevata e un anti-pattern.
- **Evidenza.** `api/resources.ts:346,367-369,373-376` (`SELECT * FROM ${table}`, `SET ${k} = ...`, `DELETE FROM ${table}`), `api/resources.ts:350-360` (`run_raw_query`).
- **Proposta.** Validare i nomi colonna contro `information_schema.columns` della
  tabella (già interrogata altrove), oppure usare `pg` identifier quoting. Per
  `run_raw_query`: mantenerlo dietro un flag di ambiente (solo non-prod) o vietare
  statement non-`SELECT`, e loggare in `action_logs`.
- **File impattati.** `api/resources.ts`.
- **Rischio.** Basso (aggiunge validazione, non cambia il flusso legittimo).
- **Accettazione.** Nessun identificatore non validato finisce in una query interpolata; test che una colonna inesistente viene rifiutata con 400.

### DB-07 — [P2] `SELECT *` pervasivo (46 occorrenze) — over-fetch e fragilità

- [ ] **Problema.** 46 query usano `SELECT *`. Restituiscono colonne non necessarie
  (banda + memoria serverless), e legano il frontend all'ordine/insieme delle colonne;
  l'aggiunta di una colonna sensibile (es. hash) rischia di trapelare via il generico
  `toCamelAndNormalize`.
- **Evidenza.** `grep "SELECT \*" api/` → 46 risultati (es. `api/resources.ts:346,405`, `api/data.ts:226,228`).
- **Proposta.** Sostituire con liste di colonne esplicite, partendo dagli endpoint che
  toccano entità sensibili (`app_users`, `action_logs`). Definire una mappa
  `entity → columns` (accanto a `TABLE_MAPPING`) come fonte unica.
- **File impattati.** `api/resources.ts`, `api/data.ts`, `api/staffing.ts`.
- **Rischio.** Medio (facile omettere una colonna usata dal frontend). Un endpoint alla volta, con i test.
- **Accettazione.** Le entità sensibili non usano più `SELECT *`; nessuna regressione nei payload consumati dai context.

---

## Parte 2 — Backend (API)

### API-01 — [P1] `catch` di migrazione silenziosi in `schema.ts`

- [ ] **Problema.** Diversi `catch (e) { /* ... */ }` in `schema.ts` inghiottono errori
  di migrazione senza log. Se una `ALTER`/`RENAME` fallisce per un motivo reale (non
  "già applicata"), lo schema resta incoerente in silenzio — in violazione della regola
  "NEVER leave empty catch blocks" di `AI.md`.
- **Evidenza.** `api/_lib/schema.ts:23,49,56,73,117,122-124`.
- **Proposta.** Sostituire i commenti-solo con `console.warn('[schema] <passo> ignorato:', (e as Error).message)` (pattern già usato a riga 105) così gli errori inattesi sono visibili nei log Vercel.
- **File impattati.** `api/_lib/schema.ts`.
- **Rischio.** Nullo (solo logging).
- **Accettazione.** Nessun catch privo di log in `schema.ts`; il hook `post-edit-checks.sh` (empty-catch detector) resta verde.

### API-02 — [P2] Ridurre gli `: any` nel backend (83 occorrenze)

- [ ] **Problema.** 83 annotazioni `: any` nel layer `api/`, in particolare i due
  convertitori `toCamelAndNormalize`/`toCamelCase` (`o: any`) e le `.map((r: any) => ...)`.
  La Fase 4 (vedi appendice) ha già tipizzato il frontend; il backend è rimasto indietro.
- **Evidenza.** `grep ": any" api/` → 83; `api/resources.ts:18`, `api/data.ts:14`.
- **Proposta.** Introdurre tipi riga per le entità principali (riusare `types.ts` dove
  possibile) e tipizzare i convertitori con generics (`<T extends Record<string, unknown>>`).
  Procedere per file, mantenendo i gate verdi.
- **File impattati.** `api/*.ts`, eventuale nuovo `api/_lib/rowTypes.ts`.
- **Rischio.** Medio (i convertitori sono usati ovunque). Un file alla volta.
- **Accettazione.** Riduzione misurabile degli `: any` (target: dimezzare) senza nuovi errori tsc/eslint.

### API-03 — [P2] N+1 e query di arricchimento nel trigger notifiche

- [ ] **Problema.** `triggerNotification` esegue query puntuali dentro cicli/branch
  (lookup di nome ruolo, nome risorsa, nome skill, ecc.) una alla volta. Con più
  entità coinvolte diventa un pattern N+1 nel percorso di scrittura.
- **Evidenza.** `api/resources.ts:47,74,103,107,278` (query singole di lookup dentro il trigger).
- **Proposta.** Dove servono più lookup, accorparli in un'unica query con `JOIN`/`IN`,
  oppure passare i dati già disponibili dal chiamante evitando il round-trip.
- **File impattati.** `api/resources.ts`.
- **Rischio.** Basso/medio; coperto dai test se presenti sul flusso notifiche.
- **Accettazione.** Nessuna regressione nel contenuto delle notifiche; riduzione delle query per operazione.

### API-04 — [P3] Dipendenza `zod` reale inutilizzata (aliasata alla lib custom)

- [ ] **Problema.** `package.json` dichiara `zod@^3.23.8` tra le dependencies, ma sia
  `tsconfig.json` sia `vite.config.ts` **aliasano** `zod` → `./libs/zod` (implementazione
  custom). Il pacchetto reale non viene mai importato: è peso morto nel lockfile e
  fonte di confusione (chi legge crede si usi Zod ufficiale).
- **Evidenza.** `package.json` (`"zod": "^3.23.8"`), `tsconfig.json:25`, `vite.config.ts:33,42`, nota in `AI.md:342-347`.
- **Proposta.** Rimuovere `zod` dalle dependencies (resta la lib locale `libs/zod.ts`),
  **oppure** — decisione di prodotto — migrare alla Zod ufficiale e togliere l'alias.
  Default consigliato: rimuovere la dipendenza morta.
- **File impattati.** `package.json`, `package-lock.json`.
- **Rischio.** Basso (l'alias garantisce che nessun import risolva al pacchetto reale). Verificare `npm ci` + build.
- **Accettazione.** `npm run build` e i test restano verdi senza il pacchetto `zod` reale installato.

---

## Parte 3 — Frontend

### FE-01 — [P2] File di pagina ancora molto grandi

- [ ] **Problema.** Restano pagine oltre le ~1000 righe che concentrano dati, UI e
  logica, difficili da testare e da far evolvere.
- **Evidenza.** `pages/StaffingPage.tsx` (1342), `pages/dashboard/DashboardCards.tsx` (1323), `pages/SkillAnalysisPage.tsx` (1203), `pages/DashboardPage.tsx` (1086), `pages/SimulationPage.tsx` (1061).
- **Proposta.** Applicare lo stesso metodo già collaudato nelle fasi precedenti
  (vedi appendice): estrarre sotto-componenti presentazionali e funzioni pure in
  moduli dedicati, senza cambiare comportamento. Priorità a `StaffingPage.tsx` e
  `SkillAnalysisPage.tsx` (non ancora spezzati).
- **File impattati.** le pagine sopra + nuove cartelle `pages/<area>/`.
- **Rischio.** Medio; solo spostamento di codice, zero logica nuova, verificato dai gate + `vite build`.
- **Accettazione.** Ogni pagina target sotto ~800 righe; comportamento invariato; build verde.

### FE-02 — [P3] Completare la migrazione dagli hook legacy `useEntitiesContext`

- [ ] **Problema.** `AppContext` espone `useEntitiesContext()` per retro-compatibilità;
  il suo uso causa re-render più larghi del necessario. La direzione documentata è
  usare gli hook di dominio (`useResourcesContext`, ecc.).
- **Evidenza.** `AI.md:261,274-276`; `context/AppContext.tsx`.
- **Proposta.** Censire i consumatori di `useEntitiesContext` e migrarli agli hook di
  dominio, uno alla volta; quando l'ultimo è migrato, valutare la rimozione dello shim.
- **File impattati.** vari `pages/`/`components/` + `context/AppContext.tsx`.
- **Rischio.** Basso per consumatore; verificabile con i test dei componenti.
- **Accettazione.** Zero import di `useEntitiesContext` (o lista residua giustificata); nessuna regressione UI.

### FE-03 — [P3] Copertura test dei context React

- [ ] **Problema.** Le sessioni di test precedenti (vedi `AI-ToDo.md`) hanno lasciato
  scoperti i context di dominio (`AppContext`, `ResourcesContext`, `ProjectsContext`, ...).
  Sono il cuore dello stato applicativo.
- **Evidenza.** `AI-ToDo.md:75-79` ("Lacune rimaste: Contesti React").
- **Proposta.** Aggiungere test per i reducer/callback dei context (initialize, cascade
  delete, ottimistic update con `version`), sul modello di `KnowledgeBaseContext.test.tsx`.
- **File impattati.** nuovi `context/*.test.tsx`.
- **Rischio.** Nullo (solo test aggiunti).
- **Accettazione.** Nuovi test verdi; aumento misurabile della copertura sui context.

---

## Riepilogo prioritizzato (ordine di esecuzione suggerito)

| Ordine | ID | Priorità | Titolo | Area |
|---|---|---|---|---|
| 1 | DB-01 | P0 | `wbs_tasks` mancante nello schema | DB |
| 2 | DB-02 | P0 | Seed in drift (`horizontals`) | DB |
| 3 | DB-06 | P0 | SQL dinamico non validato (db_inspector) | DB/API |
| 4 | DB-04 | P1 | Indici mancanti (allocations, FK) | DB |
| 5 | DB-05 | P1 | Schema-init nel request path | DB/API |
| 6 | API-01 | P1 | Catch di migrazione silenziosi | API |
| 7 | DB-03 | P1 | Unificare le fonti di verità dello schema | DB |
| 8 | DB-07 | P2 | Eliminare `SELECT *` sensibili | DB/API |
| 9 | API-02 | P2 | Ridurre `: any` nel backend | API |
| 10 | API-03 | P2 | N+1 nei trigger notifiche | API |
| 11 | FE-01 | P2 | Spezzare pagine grandi | FE |
| 12 | API-04 | P3 | Rimuovere dipendenza `zod` morta | Build |
| 13 | FE-02 | P3 | Migrare da `useEntitiesContext` | FE |
| 14 | FE-03 | P3 | Test dei context React | FE |

---

## Log avanzamento

- 2026-07-21: Riscritto REFACTORING.md come backlog GOAL-driven App+DB. Analisi (solo
  lettura) del codebase: individuati 2 bug di drift schema P0 (DB-01, DB-02), superficie
  SQL dinamico (DB-06), assenza totale di indici (DB-04), schema-init incoerente (DB-05)
  e 4 fonti di verità dello schema (DB-03). Nessun codice modificato.

---

## Appendice — Storico refactoring completato (Fasi 1–4, giu 2026)

> Conservato per contesto. Questi interventi sono **già stati eseguiti** e verificati
> (baseline: `tsc` 0 errori, `vitest` 380→387 test, `eslint` 0 warning).

**Fase 1 — Pulizia codice morto [COMPLETATA].** Rimossa cartella `src/` duplicata ed
esclusa dalla compilazione; aggiornato il riferimento testuale in `UserManualPage.tsx`.
Commit `cb4d7ee`.

**Fase 2 — Consolidamento test duplicati [COMPLETATA].** Unite 5 coppie di test
divergenti (dateUtils, zod, costUtils, formatters, apiClient) in file canonici co-locati;
23 → 18 file di test, 380 test invariati (zero perdita di copertura). `__tests__/` UI
lasciati invariati.

**Fase 3 — Spezzare file enormi [COMPLETATA].** Solo spostamento di codice, zero logica
cambiata, verificato anche con `vite build`:
- `DashboardPage.tsx` 2362 → 1075 (28 card in `pages/dashboard/`)
- `SecurityCenterPage.tsx` 1822 → 87 (6 pillar in `pages/security/`)
- `api/resources.ts` 1052 → 740 (config statiche in `api/_lib/resourcesConfig.ts`)
- `SimulationPage.tsx` 1453 → 1061 (reducer + 2 modali in `pages/simulation/`)
- `ProjectsPage.tsx` 1012 → 657 (2 modali in `pages/projects/`)

**Fase 4 — Robustezza tipi [COMPLETATA].** Nuovo helper `utils/getErrorMessage.ts`;
convertite 55 occorrenze `catch (e: any)` → `catch (e: unknown)` + helper. Tipizzate le
props delle 28 card Dashboard (`any` 71 → 16) con nuovo `pages/dashboard/dashboardTypes.ts`.
Eliminati 3 cast `as any` nei pillar Security (tipo `PillarId`, `AppUser['role']`).
</content>
</invoke>
