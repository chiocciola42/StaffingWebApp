/**
 * @file context/KnowledgeBaseContext.tsx
 * @description Contesto per la gestione delle schede della Knowledge Base.
 * Contesto isolato e auto-sufficiente: carica le proprie schede al montaggio via apiFetch
 * e fornisce le operazioni CRUD.
 * Segue lo stesso pattern dei sub-context di dominio (es. SkillsContext).
 */

import React, { createContext, useState, useContext, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useToast } from './ToastContext';
import { apiFetch } from '../services/apiClient';
import type { KBArticle, KBArticleInput } from '../types/knowledgeBase';

const KB_ENDPOINT = '/api/resources?entity=knowledge_base_articles';

export interface KnowledgeBaseContextValue {
    articles: KBArticle[];
    loading: boolean;
    error: string | null;
    isMutating: boolean;
    fetchArticles: () => Promise<void>;
    addArticle: (input: KBArticleInput) => Promise<void>;
    updateArticle: (article: KBArticle) => Promise<void>;
    deleteArticle: (id: string) => Promise<void>;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextValue | undefined>(undefined);

export const KnowledgeBaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();

    const [articles, setArticles] = useState<KBArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMutating, setIsMutating] = useState(false);

    const fetchArticles = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<KBArticle[]>(KB_ENDPOINT);
            setArticles(Array.isArray(data) ? data : []);
        } catch (e: unknown) {
            setArticles([]);
            setError(getErrorMessage(e) || 'Errore durante il caricamento delle schede.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const addArticle = useCallback(async (input: KBArticleInput): Promise<void> => {
        setIsMutating(true);
        const now = new Date().toISOString();
        const payload = { ...input, createdAt: now, updatedAt: now };
        try {
            const created = await apiFetch<KBArticle>(KB_ENDPOINT, {
                method: 'POST', body: JSON.stringify(payload),
            });
            setArticles(prev => [created, ...prev]);
            addToast('Scheda creata con successo', 'success');
        } catch (e: unknown) {
            addToast(getErrorMessage(e) || 'Errore durante la creazione della scheda.', 'error');
            throw e;
        } finally {
            setIsMutating(false);
        }
    }, [addToast]);

    const updateArticle = useCallback(async (article: KBArticle): Promise<void> => {
        setIsMutating(true);
        const payload = { ...article, updatedAt: new Date().toISOString() };
        try {
            const updated = await apiFetch<KBArticle>(`${KB_ENDPOINT}&id=${article.id}`, {
                method: 'PUT', body: JSON.stringify(payload),
            });
            setArticles(prev => prev.map(a => a.id === article.id ? updated : a));
            addToast('Scheda aggiornata', 'success');
        } catch (e: unknown) {
            addToast(getErrorMessage(e) || 'Errore durante l\'aggiornamento della scheda.', 'error');
            throw e;
        } finally {
            setIsMutating(false);
        }
    }, [addToast]);

    const deleteArticle = useCallback(async (id: string): Promise<void> => {
        setIsMutating(true);
        try {
            await apiFetch(`${KB_ENDPOINT}&id=${id}`, { method: 'DELETE' });
            setArticles(prev => prev.filter(a => a.id !== id));
            addToast('Scheda eliminata', 'success');
        } catch (e: unknown) {
            addToast(getErrorMessage(e) || 'Errore durante l\'eliminazione della scheda.', 'error');
            throw e;
        } finally {
            setIsMutating(false);
        }
    }, [addToast]);

    const value = useMemo<KnowledgeBaseContextValue>(() => ({
        articles, loading, error, isMutating,
        fetchArticles, addArticle, updateArticle, deleteArticle,
    }), [articles, loading, error, isMutating, fetchArticles, addArticle, updateArticle, deleteArticle]);

    return <KnowledgeBaseContext.Provider value={value}>{children}</KnowledgeBaseContext.Provider>;
};

export const useKnowledgeBaseContext = (): KnowledgeBaseContextValue => {
    const ctx = useContext(KnowledgeBaseContext);
    if (!ctx) throw new Error('useKnowledgeBaseContext must be used within KnowledgeBaseProvider');
    return ctx;
};
