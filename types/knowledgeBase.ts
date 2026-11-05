/**
 * @file types/knowledgeBase.ts
 * @description Definizioni dei tipi per la sezione "Knowledge Base".
 * Le schede (KBArticle) possono essere collegate alle entità di dominio esistenti
 * (Risorse, Competenze, Progetti, Contratti, Clienti) tramite LinkedEntity.
 */

/** Formato del contenuto di una scheda KB. */
export type ContentFormat = 'html' | 'plain';

/** Tipo di entità di dominio a cui una scheda KB può essere collegata. */
export type LinkedEntityType = 'risorsa' | 'competenza' | 'progetto' | 'contratto' | 'cliente';

/**
 * Collegamento di una scheda KB a una specifica entità di dominio.
 * `label` è il nome visualizzato salvato al momento del collegamento:
 * NON viene risolto dinamicamente (così resta stabile anche se l'entità cambia nome).
 */
export interface LinkedEntity {
    entityType: LinkedEntityType;
    entityId: string;
    label: string;
}

/** Scheda della Knowledge Base. */
export interface KBArticle {
    id: string;
    title: string;
    content: string;
    format: ContentFormat;
    tags: string[];
    createdAt: string;       // ISO 8601
    updatedAt: string;       // ISO 8601
    linkedEntities: LinkedEntity[];
    /** Versione di concorrenza ottimistica gestita lato backend. */
    version?: number;
}

/** Payload per la creazione di una scheda (id e timestamp generati dal contesto/backend). */
export type KBArticleInput = Omit<KBArticle, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
