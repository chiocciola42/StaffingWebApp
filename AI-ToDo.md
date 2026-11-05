# AI-ToDo.md — Aggiornamento suite di test

## Piano

- [x] Esplorare i test esistenti e la struttura del codebase
- [x] Identificare le lacune di copertura e pianificare i nuovi test
- [x] Creare `utils/dateUtils.test.ts` (49 test)
- [x] Creare `utils/costUtils.test.ts` (14 test)
- [x] Creare `utils/formatters.test.ts` (9 test)
- [x] Creare `libs/zod.test.ts` (38 test)
- [x] Eseguire tutti i test e correggere gli errori trovati
- [x] Commit e push su branch feature

## Revisione

### Risultato finale
- **7 file di test** — **119 test** — tutti ✅ passano
- Copertura aumentata da 3 file/9 test a 7 file/119 test

### Nuovi file creati
| File | Test | Area coperta |
|---|---|---|
| `utils/dateUtils.test.ts` | 49 | parseISODate, toISODateString, addDays, getCalendarDays, isHoliday, getWorkingDaysBetween, getLeaveDurationInWorkingDays, formatDate* |
| `utils/costUtils.test.ts` | 14 | getRoleCostForDate (SCD Type 2), calculateSegmentCost |
| `utils/formatters.test.ts` | 9 | formatCurrency (numeri, stringhe, null/undefined/NaN) |
| `libs/zod.test.ts` | 38 | string, number, boolean, enum, object, array, optional, nullable, refine, ZodError.flatten() |

### Bug/problemi riscontrati e corretti
1. **Test formatCurrency con separatore migliaia**: i test verificavano `'1.000'` come output
   di `toLocaleString('it-IT')`, ma jsdom non supporta i separatori migliaia ICU per locale
   non-inglesi. Corretti usando regex flessibili (`/1[.'\s]?000/`).

### Lacune di copertura ancora presenti (priorità futura)
- Contesti React (AppContext, ResourcesContext, ecc.)
- Hooks: `useComputedSkills`, `useExport`, `useGlobalSearch` ✅ completati nella sessione 2026-03-11
- Componenti: DataTable, SearchWidget, Toast, ConfirmationModal ✅ Toast e ConfirmationModal completati nella sessione 2026-03-11
- Componenti: DataTable, SearchWidget (rimasti)
- Servizi: `apiClient.ts` ✅ completato nella sessione 2026-03-11; `mockHandlers.ts` (rimasto)
- Export/PDF: `exportUtils.ts`, `pdfExport.ts`
- Utils: `exportTableUtils.ts`, `paths.ts` ✅ completati nella sessione 2026-03-11

---

## Sessione 2 — 2026-03-11

### Piano
- [x] Implementa test per hooks: useGlobalSearch, useComputedSkills, useExport
- [x] Implementa test per componenti: Toast, ConfirmationModal
- [x] Implementa test per servizi: apiClient (apiFetch con retry/backoff)
- [x] Implementa test per exportTableUtils e paths
- [x] Esegui tutti i test e correggi gli errori trovati
- [x] Commit e push

### Risultato finale sessione 2
- **15 file di test** — **225 test** — tutti ✅ passano
- Copertura aumentata da 7 file/119 test a 15 file/225 test

### Nuovi file creati in sessione 2
| File | Test | Area coperta |
|---|---|---|
| `hooks/useGlobalSearch.test.ts` | 17 | scoring, filtri, tutti i tipi di entità, mocking context |
| `hooks/useComputedSkills.test.ts` | 12 | skill manuali/inferite, soglie livello, useCallback |
| `hooks/useExport.test.ts` | 6 | clipboard API, stati isCopying/hasCopied/error |
| `services/apiClient.test.ts` | 16 | isLocalPreview (9 hostname), retry, backoff esponenziale |
| `utils/exportTableUtils.test.ts` | 24 | buildTsv, buildHtmlTable, escape XSS, edge cases |
| `utils/paths.test.ts` | 8 | normalizePath con root, query string, slash finale |
| `components/__tests__/Toast.test.tsx` | 11 | rendering, auto-dismiss, dismiss manuale, cleanup timer |
| `components/__tests__/ConfirmationModal.test.tsx` | 12 | open/close, pulsanti, isConfirming, spinner |

### Bug/problemi riscontrati e corretti in sessione 2
1. **ConfirmationModal DOM accumulo**: senza `afterEach(cleanup)`, ogni `render()` accumula nel DOM causando "Found multiple elements". Risolto aggiungendo `cleanup` esplicito.
2. **apiClient unhandled rejection**: i test retry creano una promise che rigetta PRIMA che il test attacchi il proprio handler `.rejects`. Risolto aggiungendo `promise.catch(() => {})` subito dopo la creazione.
3. **backoff test con fake timers**: lo spy su `globalThis.setTimeout` catturava il timer FAKE (già sostituito da `vi.useFakeTimers()`). Riscritto con `vi.advanceTimersByTimeAsync()` per avanzare il clock manualmente e contare le chiamate a fetch.

### Lacune di copertura rimaste (priorità futura)
- Contesti React (AppContext, ResourcesContext, ecc.)
- Componenti: DataTable, SearchWidget
- Servizi: `mockHandlers.ts`
- Export/PDF: `exportUtils.ts`, `pdfExport.ts`
