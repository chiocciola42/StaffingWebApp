
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { SpinnerIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import { apiFetch } from '../services/apiClient';
import { useFetchData } from '../context/AppContext';
import { DataTable, ColumnDef } from '../components/DataTable';

interface Column {
    column_name: string;
    data_type: string;
}

interface TableData {
    columns: Column[];
    rows: any[];
}

interface QueryResult {
    rows: any[];
    fields: any[];
    rowCount: number;
    command: string;
}

type ViewMode = 'inspector' | 'query' | 'bulk_password';

const DbInspectorPage: React.FC = () => {
    const fetchData = useFetchData();
    const [mode, setMode] = useState<ViewMode>('inspector');
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingRowData, setEditingRowData] = useState<any | null>(null);
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isExportingPg, setIsExportingPg] = useState(false);
    const [isExportingMysql, setIsExportingMysql] = useState(false);
    
    // Query Mode State
    const [sqlQuery, setSqlQuery] = useState('');
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [queryError, setQueryError] = useState<string | null>(null);

    // Bulk Password Mode State
    const [bulkPasswordsInput, setBulkPasswordsInput] = useState('');
    const [bulkPassLoading, setBulkPassLoading] = useState(false);

    const { addToast } = useToast();

    // Used only for manual fetch (Export SQL) where apiFetch is not suitable (Blob response)
    const getAuthToken = () => localStorage.getItem('authToken');

    const handleApiError = (error: Error, responseStatus?: number) => {
        if (responseStatus === 401 || responseStatus === 403) {
            addToast('Sessione scaduta o permessi insufficienti. Effettua nuovamente il login.', 'error');
        } else {
            addToast(error.message, 'error');
        }
    };

    useEffect(() => {
        const fetchTables = async () => {
            setIsLoading(true);
            try {
                const data = await apiFetch<string[]>('/api/resources?entity=db_inspector&action=list_tables');
                setTables(data);
                if (data.length > 0) {
                    setSelectedTable(data[0]);
                }
            } catch (error) {
                handleApiError(error as Error, (error as any).status);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTables();
    }, []);

    useEffect(() => {
        if (mode !== 'inspector' || !selectedTable) {
            setTableData(null);
            return;
        }
        const fetchTableData = async () => {
            setIsLoading(true);
            setTableData(null);
            setEditingRowId(null);
            try {
                const data = await apiFetch<TableData>(`/api/resources?entity=db_inspector&action=get_table_data&table=${selectedTable}`);
                setTableData(data);
            } catch (error) {
                handleApiError(error as Error, (error as any).status);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTableData();
    }, [selectedTable, mode]);
    
    const handleEdit = (row: any) => {
        setEditingRowId(row.id);
        setEditingRowData({ ...row });
    };

    const handleCancel = () => {
        setEditingRowId(null);
        setEditingRowData(null);
    };

    const handleSave = async () => {
        if (!editingRowData || !selectedTable) return;
        setIsSaving(true);
        try {
            const updates = { ...editingRowData };
            delete updates.id;

            await apiFetch(`/api/resources?entity=db_inspector&action=update_row&table=${selectedTable}&id=${editingRowId}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });

            addToast('Riga aggiornata con successo.', 'success');
            setTableData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    rows: prev.rows.map(row => (row.id === editingRowId ? editingRowData : row)),
                };
            });
            handleCancel();
        } catch (error) {
            handleApiError(error as Error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!selectedTable) return;
        setIsSaving(true);
        try {
            await apiFetch(`/api/resources?entity=db_inspector&action=delete_all_rows&table=${selectedTable}`, {
                method: 'DELETE'
            });
            addToast(`Tutte le righe dalla tabella '${selectedTable}' sono state eliminate.`, 'success');
            setTableData(prev => prev ? { ...prev, rows: [] } : null); 
            handleCancel(); 
        } catch (error) {
            handleApiError(error as Error);
        } finally {
            setIsSaving(false);
            setIsDeleteAllModalOpen(false);
        }
    };

    const handleExport = async (dialect: 'postgres' | 'mysql') => {
        if (dialect === 'postgres') setIsExportingPg(true);
        else setIsExportingMysql(true);
    
        try {
            // NOTE: apiFetch is for JSON. Using raw fetch for BLOB response.
            const response = await fetch(`/api/export?dialect=${dialect}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to export ${dialect} SQL`);
            }
            const sql = await response.text();
            const blob = new Blob([sql], { type: 'application/sql' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `db_export_${dialect}.sql`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast(`Export ${dialect.toUpperCase()} SQL completato.`, 'success');
        } catch (error) {
            handleApiError(error as Error);
        } finally {
            if (dialect === 'postgres') setIsExportingPg(false);
            else setIsExportingMysql(false);
        }
    };

    const handleRunQuery = async () => {
        if (!sqlQuery.trim()) return;
        setIsLoading(true);
        setQueryResult(null);
        setQueryError(null);

        try {
            const data = await apiFetch<QueryResult>('/api/resources?entity=db_inspector&action=run_raw_query', {
                method: 'POST',
                body: JSON.stringify({ query: sqlQuery })
            });
            setQueryResult(data);
        } catch (e) {
            setQueryError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkPasswordUpdate = async () => {
        if (!bulkPasswordsInput.trim()) return;
        
        const lines = bulkPasswordsInput.split('\n').filter(l => l.trim().length > 0);
        const users = lines.map(line => {
            const [username, password] = line.split(',').map(s => s.trim());
            return { username, password };
        }).filter(u => u.username && u.password);

        if (users.length === 0) {
            addToast('Nessuna coppia username/password valida trovata.', 'error');
            return;
        }

        if (!confirm(`Stai per reimpostare la password per ${users.length} utenti. Confermi?`)) return;

        setBulkPassLoading(true);
        try {
            const data = await apiFetch<{successCount: number, failCount: number}>('/api/resources?entity=app-users&action=bulk_password_reset', {
                method: 'POST',
                body: JSON.stringify({ users })
            });

            addToast(`Operazione completata: ${data.successCount} successi, ${data.failCount} errori.`, 'success');
            setBulkPasswordsInput('');
        } catch (e) {
            addToast((e as Error).message, 'error');
        } finally {
            setBulkPassLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, colName: string, colType: string) => {
        if (!editingRowData) return;
        let value: any = e.target.value;
        
        if (colType.includes('boolean')) {
            value = value === 'true';
        } else if (colType.includes('int') || colType.includes('numeric')) {
            value = value === '' ? null : Number(value);
        }
        
        setEditingRowData({ ...editingRowData, [colName]: value });
    };

    // --- REFRESH HANDLER ---
    const handleGlobalRefresh = async () => {
        addToast('Ricaricamento dati globali in corso...', 'info');
        await fetchData();
        addToast('Dati aggiornati con successo.', 'success');
    };

    const renderInputField = (col: Column, value: any) => {
        const colName = col.column_name;
        const colType = col.data_type;
    
        if (colType.includes('timestamp') || colType.includes('date')) {
            const dateValue = value ? new Date(value).toISOString().split('T')[0] : '';
            return (
                <input
                    type="date"
                    value={dateValue}
                    onChange={e => handleInputChange(e, colName, colType)}
                    className="form-input text-xs p-1 h-8"
                />
            );
        }
        if (colType.includes('int') || colType.includes('numeric')) {
            return (
                <input
                    type="number"
                    value={value ?? ''}
                    onChange={e => handleInputChange(e, colName, colType)}
                    className="form-input text-xs p-1 h-8"
                />
            );
        }
        if (colType.includes('boolean')) {
            return (
                <select
                    value={String(value ?? 'false')}
                    onChange={e => handleInputChange(e, colName, colType)}
                    className="form-select text-xs p-1 h-8"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }
        return (
            <input
                type="text"
                value={value ?? ''}
                onChange={e => handleInputChange(e, colName, colType)}
                className="form-input text-xs p-1 h-8"
            />
        );
    };

    const renderCellContent = (value: any, columnName?: string) => {
        const currencyColumns = [
            'daily_cost', 'standard_cost', 'daily_expenses', 'budget', 'capienza', 'backlog',
            'produzione_lorda', 'produzione_lorda_network_italia', 'perdite', 'spese_onorari_esterni',
            'spese_altro', 'fatture_onorari', 'fatture_spese', 'iva', 'incassi', 'amount'
        ];
    
        if (columnName && currencyColumns.includes(columnName) && (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value))))) {
            return formatCurrency(Number(value));
        }
        
        if (value === null || value === undefined) return <span className="text-on-surface-variant/50 italic text-[10px]">NULL</span>;
        if (typeof value === 'boolean') return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${value ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>{value ? 'true' : 'false'}</span>;
        if (typeof value === 'object' && value !== null) return <code className="text-[10px] bg-surface-container-high px-1 rounded">{JSON.stringify(value)}</code>;
        return <span className="truncate block max-w-[200px]" title={String(value)}>{String(value)}</span>;
    };

    // --- DataTable Adaptation ---
    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!tableData) return [];
        return tableData.columns.map(col => ({
            header: col.column_name,
            sortKey: col.column_name,
            minWidth: 150,
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs text-on-surface">{renderCellContent(row[col.column_name], col.column_name)}</span>
                    <span className="text-[9px] text-on-surface-variant/40 font-mono tracking-tighter">{col.data_type}</span>
                </div>
            )
        }));
    }, [tableData]);

    const renderRow = (row: any) => {
        const isEditing = editingRowId === row.id;

        if (isEditing && tableData) {
            return (
                <tr key={row.id} className="bg-surface-container border-b border-primary/20">
                    {tableData.columns.map(col => (
                        <td key={col.column_name} className="px-4 py-2 align-middle">
                             {col.column_name !== 'id' ? (
                                renderInputField(col, editingRowData[col.column_name])
                             ) : (
                                <span className="text-xs text-on-surface-variant font-mono bg-surface px-1 rounded">{row.id}</span>
                             )}
                        </td>
                    ))}
                    {/* Action Column MUST be last for DataTable to sticky it left correctly */}
                    <td className="px-2 py-2 text-center">
                         <div className="flex items-center justify-center gap-1">
                            <button onClick={handleSave} disabled={isSaving} className="p-1 rounded bg-primary text-on-primary shadow-sm hover:opacity-90 disabled:opacity-50" aria-label="Salva" title="Salva">
                                {isSaving ? <SpinnerIcon className="w-4 h-4"/> : <span className="material-symbols-outlined text-sm">check</span>}
                            </button>
                            <button onClick={handleCancel} disabled={isSaving} className="p-1 rounded bg-surface-variant text-on-surface-variant hover:bg-surface-container-high" aria-label="Annulla" title="Annulla">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    </td>
                </tr>
            );
        }

        return (
            <tr key={row.id} className="hover:bg-surface-container-low transition-colors border-b border-outline-variant/30 group">
                {columns.map((col, i) => (
                    <td key={i} className="px-4 py-3 bg-inherit align-middle">
                        {col.cell(row)}
                    </td>
                ))}
                {/* Action Column MUST be last for DataTable to sticky it left correctly */}
                 <td className="px-2 py-2 text-center">
                    <button onClick={() => handleEdit(row)} className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors" title="Modifica Riga">
                        <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                </td>
            </tr>
        );
    };

    const filtersNode = (
        <div className="flex flex-col xl:flex-row gap-4 items-end justify-between w-full">
            <div className="w-full xl:w-1/3">
                 <label htmlFor="table-select" className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tabella Database</label>
                 <div className="relative">
                    <select
                        id="table-select"
                        value={selectedTable}
                        onChange={e => setSelectedTable(e.target.value)}
                        className="form-select w-full text-sm font-medium"
                        disabled={isLoading}
                    >
                        {tables.map(table => <option key={table} value={table}>{table}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                 <button
                    onClick={() => handleExport('postgres')}
                    disabled={isLoading || isExportingPg || isExportingMysql}
                    className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider rounded-full disabled:opacity-50 hover:bg-primary/20 transition-all border border-primary/20"
                >
                    {isExportingPg ? <SpinnerIcon className="w-4 h-4 mr-1"/> : <span className="material-symbols-outlined text-base mr-1">download</span>}
                    PG Dump
                </button>
                <button
                    onClick={() => handleExport('mysql')}
                    disabled={isLoading || isExportingPg || isExportingMysql}
                    className="inline-flex items-center justify-center px-4 py-2 bg-tertiary/10 text-tertiary font-bold text-xs uppercase tracking-wider rounded-full hover:bg-tertiary/20 disabled:opacity-50 transition-all border border-tertiary/20"
                >
                    {isExportingMysql ? <SpinnerIcon className="w-4 h-4 mr-1"/> : <span className="material-symbols-outlined text-base mr-1">download</span>}
                    MySQL Dump
                </button>
                <button
                    onClick={() => setIsDeleteAllModalOpen(true)}
                    disabled={isLoading || !selectedTable || !tableData || tableData.rows.length === 0}
                    className="inline-flex items-center justify-center px-4 py-2 bg-error text-on-error font-bold text-xs uppercase tracking-wider rounded-full hover:opacity-90 disabled:opacity-50 shadow-sm transition-all ml-2"
                    title="Elimina Tutte le Righe dalla Tabella Selezionata"
                >
                    <span className="material-symbols-outlined text-base mr-1">delete_forever</span>
                    Svuota
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-4 rounded-2xl shadow-sm border border-outline-variant">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary-container rounded-xl text-on-secondary-container">
                        <span className="material-symbols-outlined text-2xl">database</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface leading-none">Database Inspector</h1>
                        <p className="text-xs text-on-surface-variant mt-1">Gestione avanzata e query diretta sui dati</p>
                    </div>
                </div>
                
                <button
                    onClick={handleGlobalRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface font-bold rounded-full hover:bg-surface-container-high transition-all text-xs uppercase tracking-wider"
                    title="Forza il ricaricamento di tutti i dati applicativi dal database"
                >
                    <span className="material-symbols-outlined text-lg">sync</span>
                    Ricarica App
                </button>
            </div>
            
            <div className="flex border-b border-outline-variant bg-surface rounded-t-2xl px-2">
                <button 
                    onClick={() => setMode('inspector')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mode === 'inspector' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    <span className="material-symbols-outlined text-lg">table_view</span> Ispettore Tabelle
                </button>
                <button 
                    onClick={() => setMode('query')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mode === 'query' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    <span className="material-symbols-outlined text-lg">terminal</span> SQL Editor
                </button>
                <button 
                    onClick={() => setMode('bulk_password')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mode === 'bulk_password' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    <span className="material-symbols-outlined text-lg">password</span> Bulk Password
                </button>
            </div>

            {mode === 'inspector' && (
                <div className="animate-fade-in">
                    {/* Using the standard DataTable component */}
                    <DataTable
                        title=""
                        addNewButtonLabel=""
                        onAddNew={() => {}}
                        data={tableData?.rows || []}
                        columns={columns}
                        filtersNode={filtersNode}
                        renderRow={renderRow}
                        renderMobileCard={() => <></>} // Not optimized for mobile yet
                        isLoading={isLoading}
                        // Important: Actions column is managed by renderRow logic + sticky positioning
                        numActions={1} 
                        actionsWidth={100}
                        tableLayout={{ dense: true, striped: true, headerSticky: true, headerBackground: true, headerBorder: true }}
                    />
                </div>
            )}

            {mode === 'query' && (
                <div className="animate-fade-in space-y-4">
                    <div className="bg-surface rounded-2xl shadow p-6 border border-outline-variant">
                        <label className="block text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">code</span> Query SQL Raw
                        </label>
                        <div className="relative">
                            <textarea 
                                value={sqlQuery}
                                onChange={e => setSqlQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                        handleRunQuery();
                                    }
                                }}
                                className="form-textarea font-mono text-sm w-full h-40 bg-surface-container-low text-on-surface border-outline-variant focus:ring-primary rounded-xl p-4 leading-relaxed"
                                placeholder="SELECT * FROM app_users WHERE role = 'ADMIN'..."
                            ></textarea>
                            <div className="absolute bottom-4 right-4 text-[10px] text-on-surface-variant bg-surface/80 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                                Ctrl + Enter per eseguire
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={handleRunQuery}
                                disabled={isLoading || !sqlQuery.trim()}
                                className="px-6 py-2 bg-primary text-on-primary font-bold rounded-full hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                            >
                                {isLoading ? <SpinnerIcon className="w-5 h-5" /> : <span className="material-symbols-outlined">play_arrow</span>}
                                Esegui Query
                            </button>
                        </div>
                    </div>

                    {queryError && (
                        <div className="p-4 bg-error-container text-on-error-container rounded-xl border border-error/20 flex gap-3 items-start">
                            <span className="material-symbols-outlined shrink-0 mt-0.5">error</span>
                            <div>
                                <strong className="block text-sm font-bold mb-1">Errore SQL</strong>
                                <pre className="text-xs whitespace-pre-wrap font-mono opacity-90">{queryError}</pre>
                            </div>
                        </div>
                    )}

                    {queryResult && (
                        <ErrorBoundary label="Errore Risultati Query">
                            <div className="bg-surface rounded-2xl shadow overflow-hidden border border-outline-variant">
                                <div className="p-3 bg-surface-container border-b border-outline-variant flex justify-between items-center">
                                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">table_rows</span> Risultati
                                    </span>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface px-2 py-1 rounded border border-outline-variant">Rows: {queryResult.rowCount}</span>
                                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface px-2 py-1 rounded border border-outline-variant">Cmd: {queryResult.command}</span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-[500px]">
                                    <table className="min-w-full divide-y divide-outline-variant text-sm">
                                        <thead className="bg-surface-container-low sticky top-0">
                                            <tr>
                                                {queryResult.fields.map((field: any) => (
                                                    <th key={field.name} className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap border-b border-outline-variant bg-surface-container-low">
                                                        {field.name}
                                                        <span className="ml-1 text-[9px] opacity-50 normal-case font-mono bg-surface-variant px-1 rounded">{field.dataTypeID}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant bg-surface">
                                            {queryResult.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-surface-container-low transition-colors">
                                                    {queryResult.fields.map((field: any) => (
                                                        <td key={field.name} className="px-4 py-2 whitespace-nowrap text-on-surface font-mono text-xs">
                                                            {renderCellContent(row[field.name])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {queryResult.rows.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant opacity-60">
                                            <span className="material-symbols-outlined text-4xl mb-2">data_object</span>
                                            <p className="text-sm font-medium">Nessun risultato restituito dalla query.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ErrorBoundary>
                    )}
                </div>
            )}

            {mode === 'bulk_password' && (
                <div className="animate-fade-in space-y-4">
                    <div className="bg-surface rounded-2xl shadow p-8 border border-outline-variant">
                        <h2 className="text-xl font-bold text-on-surface mb-2 flex items-center gap-2">
                             <span className="material-symbols-outlined text-primary">lock_reset</span>
                             Importazione Bulk Password
                        </h2>
                        <p className="text-sm text-on-surface-variant mb-6 bg-surface-container-low p-4 rounded-xl flex gap-2">
                            <span className="material-symbols-outlined text-tertiary text-lg flex-shrink-0">info</span>
                            <span>
                                Inserisci qui sotto l'elenco delle coppie <strong>Username, Password</strong> (una per riga, separate da virgola).
                                <br />
                                Le password verranno crittografate e aggiornate. Gli utenti saranno forzati al cambio password al prossimo accesso.
                            </span>
                        </p>
                        
                        <textarea 
                            value={bulkPasswordsInput}
                            onChange={e => setBulkPasswordsInput(e.target.value)}
                            className="form-textarea font-mono text-xs w-full h-64 bg-surface-container-lowest text-on-surface border-outline-variant focus:ring-primary rounded-xl p-4 leading-relaxed shadow-inner"
                            placeholder={"mario.rossi, Password123!\nluigi.verdi, Segreta2024\n..."}
                        ></textarea>
                        
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleBulkPasswordUpdate}
                                disabled={bulkPassLoading || !bulkPasswordsInput.trim()}
                                className="px-6 py-2 bg-tertiary-container text-on-tertiary-container font-bold rounded-full hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all"
                            >
                                {bulkPassLoading ? <SpinnerIcon className="w-5 h-5" /> : <span className="material-symbols-outlined">upload</span>}
                                Aggiorna Password
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <ConfirmationModal
                isOpen={isDeleteAllModalOpen}
                onClose={() => setIsDeleteAllModalOpen(false)}
                onConfirm={handleDeleteAll}
                title={`Conferma Eliminazione Totale`}
                message={
                    <>
                        Sei assolutamente sicuro di voler eliminare <strong>tutte le righe</strong> dalla tabella <span className="font-mono bg-surface-variant px-1 rounded">{selectedTable}</span>?
                        <br />
                        <span className="text-error font-bold mt-2 block">Questa azione è irreversibile e distruttiva.</span>
                    </>
                }
                isConfirming={isSaving}
                confirmButtonText="Sì, Svuota Tabella"
                confirmPhrase={selectedTable || undefined}
            />
        </div>
    );
};

export default DbInspectorPage;
