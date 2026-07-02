import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { ProfiledDatasetResponse } from './types/data';

export default function App() {
    const [dataset, setDataset] = useState<ProfiledDatasetResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMetric, setSelectedMetric] = useState<string>('');
    const [selectedLabel, setSelectedLabel] = useState<string>('');
    const [showToast, setShowToast] = useState<boolean>(false);

    // Drag and drop focus state tracking
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination state for the data chart
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 6;

    // Unified payload processor for files coming via click or drop handlers
    const processFilePayload = async (file: File | undefined): Promise<void> => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setDataset(null);
        setShowToast(false);
        setCurrentPage(1);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/data/process-dynamic', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Something went wrong. Status code: ${response.status}`);
            }

            const result: ProfiledDatasetResponse = await response.json();

            if (result && result.cleanedRecords && Array.isArray(result.cleanedRecords)) {
                result.cleanedRecords = result.cleanedRecords.map(record => {
                    const updatedRecord = { ...record };
                    Object.keys(updatedRecord).forEach(key => {
                        if (typeof updatedRecord[key] === 'string' && updatedRecord[key].trim() === 'ERROR') {
                            updatedRecord[key] = 'UNKNOWN';
                        }
                    });
                    return updatedRecord;
                });
            }

            setDataset(result);

            // Trigger the custom status popup on the top right
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
            }, 6000);

            const numericCols = result.columns.filter(c => c.dataType === 'Numeric');
            const textCols = result.columns.filter(c => c.dataType === 'Text');

            if (numericCols.length > 0) setSelectedMetric(numericCols[0].systemKey);
            if (textCols.length > 0) setSelectedLabel(textCols[0].systemKey);

        } catch (err) {
            console.error("File upload error:", err);
            setError(err instanceof Error ? err.message : "We couldn't process this file. Please make sure it is a valid, formatted table asset.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        processFilePayload(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        if (!loading) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (loading) return;
        const file = e.dataTransfer.files?.[0];
        processFilePayload(file);
    };

    const handleContainerClick = (): void => {
        if (!loading && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleDownloadCSV = (): void => {
        if (!dataset || dataset.cleanedRecords.length === 0) return;

        const headers = dataset.columns.map(col => col.displayLabel);
        const keys = dataset.columns.map(col => col.systemKey);

        const csvRows = [
            headers.join(','),
            ...dataset.cleanedRecords.map(row =>
                keys.map(key => {
                    const value = row[key];
                    const stringValue = value === null || value === undefined ? '' : String(value);
                    return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
                        ? `"${stringValue.replace(/"/g, '""')}"`
                        : stringValue;
                }).join(',')
            )
        ];

        const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(csvBlob);

        const anchorLink = document.createElement('a');
        anchorLink.href = blobUrl;
        anchorLink.setAttribute('download', `Cleaned_Data_${Date.now()}.csv`);
        document.body.appendChild(anchorLink);
        anchorLink.click();
        document.body.removeChild(anchorLink);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentChartData = dataset ? dataset.cleanedRecords.slice(indexOfFirstItem, indexOfLastItem) : [];
    const totalPages = dataset ? Math.ceil(dataset.cleanedRecords.length / itemsPerPage) : 1;

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    return (
        <div className="min-h-screen w-screen bg-slate-50 text-slate-900 antialiased overflow-x-hidden flex flex-col font-sans relative">

            {/* ROAMING BLUE GRADIENT CIRCLE */}
            <div className="absolute top-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-gradient-to-tr from-blue-400 via-sky-300 to-indigo-400 opacity-40 blur-[80px] md:blur-[120px] pointer-events-none z-0 animate-roam" />

            {/* TOP RIGHT TOAST POP-UP */}
            {showToast && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3.5 bg-slate-900 text-white px-5 py-4 rounded-xl shadow-xl border border-slate-800 max-w-sm transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-amber-500 text-slate-950 p-1 rounded-full flex items-center justify-center flex-shrink-0 w-5 h-5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-xs font-medium leading-relaxed m-0 text-slate-200">
                        Any missing values are filled with <span className="text-amber-400 font-bold font-mono">"UNKNOWN"</span> instead of guessing the data.
                    </p>
                    <button
                        onClick={() => setShowToast(false)}
                        className="text-slate-400 hover:text-white transition-colors pl-1 cursor-pointer bg-transparent border-none text-base font-bold leading-none align-middle"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Hidden native input element used universally for manual browser window searching */}
            <input
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                id="csv-file-picker"
                disabled={loading}
            />

            {/* MAIN WORKSPACE CONTAINER */}
            <div className="max-w-(screen-2xl) w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-32 xl:px-44 py-12 md:py-16 box-border relative z-10 flex flex-col justify-center">

                {/* DYNAMIC LAYOUT SWITCHER */}
                {dataset ? (
                    /* ONE COLUMN LAYOUT (WHEN CSV IS UPLOADED) */
                    <div className="flex flex-col space-y-8 w-full">
                        {/* Title and Badge Metadata */}
                        <div className="space-y-3 w-full">
                            <span className="inline-block text-[12px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md mb-5" style={{ fontFamily: 'Arial, sans-serif' }}>
                                Free Online Tool
                            </span>
                            <h2 className="text-4xl sm:text-5xl md:text-7xl font-semibold text-slate-900 m-0" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.06em' }}>
                                CleanData Studio
                            </h2>
                            <p className="text-md md:text-base text-slate-600 leading-relaxed mt-3" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.01em' }}>
                                Your data has been processed successfully. Below you can visualize your cleaned parameters, review the updated structures, and download your export-ready output file.
                            </p>
                        </div>

                        {/* Control actions bar */}
                        <div className="flex flex-col sm:flex-row gap-4 items-center w-full max-w-2xl">
                            <button
                                type="button"
                                onClick={handleContainerClick}
                                className={`px-8 py-3.5 text-sm font-semibold rounded-xl transition-all block text-center cursor-pointer w-full sm:flex-1 shadow-sm ${loading
                                    ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed animate-pulse"
                                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-98 border border-blue-700"
                                    }`} style={{ fontFamily: 'Arial, sans-serif' }}
                            >
                                {loading ? "Reading File..." : "Upload Another File"}
                            </button>

                            <button
                                type="button"
                                onClick={handleDownloadCSV}
                                className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98 transition-all shadow-sm cursor-pointer border border-emerald-700 w-full sm:flex-1" style={{ fontFamily: 'Arial, sans-serif' }}
                            >
                                Download Cleaned CSV
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-xl text-xs font-medium tracking-wide shadow-xs w-full">
                                <span className="font-bold text-red-800">Processing Error:</span> {error}
                            </div>
                        )}

                        {/* Health Summary Dashboard Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                            {[
                                { label: "Processed Rows", val: dataset.healthReport.totalRowsProcessed, color: "text-blue-600", border: "border-blue-200" },
                                { label: "Duplicates Cleared", val: dataset.healthReport.duplicatesRemovedCount, color: "text-red-600", border: "border-slate-200" },
                                { label: "Empty Injections", val: dataset.healthReport.imputedMissingValuesCount, color: "text-amber-600", border: "border-slate-200" }
                            ].map((card, i) => (
                                <div key={i} className={`bg-white border ${card.border} p-5 rounded-xl shadow-2xs h-[115px] flex flex-col justify-center`}>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 m-0">{card.label}</p>
                                    <h4 className={`text-xl font-bold tracking-tight m-0 ${card.color}`}>{card.val.toLocaleString()}</h4>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* TWO-COLUMN CONTROL LAYER (BEFORE UPLOAD / WHILE LOADING) */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch w-full">

                        {/* LEFT COLUMN: BRAND CONTROLLER */}
                        <div className="lg:col-span-5 flex flex-col justify-between max-w-xl w-full py-2 space-y-6 lg:space-y-0">
                            <div className="space-y-3 w-full">
                                <div className="mb-2">
                                    <span className="inline-block text-[10px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md">
                                        Free Online Tool
                                    </span>
                                </div>
                                <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-normal text-slate-900 mt-7" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.06em' }}>
                                    CleanData Studio
                                </h2>
                                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-2 mt-3" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.03em' }}>
                                    A tool that automatically removes duplicates, standardizes formatting, and creates clear visualizations from your spreadsheet.
                                </p>
                            </div>

                            {/* Privacy and Verification Tags positioned contextually below copy */}
                            <div className="flex flex-row items-center gap-6 pt-4 lg:pt-0 mt-5 border-t lg:border-none border-slate-200/60">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                        <span className="text-xs font-normal tracking-wider" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.04em' }}>100% Privacy</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                        <span className="text-xs font-normal tracking-wider" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.04em' }}>Instant Results</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: ACTIVE INTERACTIVE WORKSPACE DROP ZONE */}
                        <div className="lg:col-span-7 w-full flex flex-col justify-center">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-5 mb-4 rounded-xl text-xs font-medium tracking-wide shadow-xs">
                                        <span className="font-bold text-red-800" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.02em' }}>Processing Error:</span> {error}
                                </div>
                            )}

                            {loading ? (
                                    <div className="min-h-[280px] lg:h-full bg-white border border-slate-200 rounded-xl animate-pulse w-full flex items-center justify-center text-slate-400 text-sm font-medium" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.02em' }}>
                                    Parsing table matrices...
                                </div>
                            ) : (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={handleContainerClick}
                                    className={`min-h-[280px] lg:h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 bg-white transition-all text-center w-full relative z-10 cursor-pointer ${isDragging
                                            ? "border-blue-500 bg-blue-50/40 scale-[1.01] shadow-md"
                                            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50 shadow-2xs"
                                        }`}
                                >
                                    {/* Styled Cloud/Upload Graphic Indicator */}
                                    <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                        </svg>
                                    </div>

                                            <h3 className="text-base font-bold text-slate-700 uppercase m-0" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.02em' }}>
                                        {isDragging ? "Drop your dataset file here" : "Drag a CSV or XLSX file here"}
                                    </h3>
                                            <p className="text-sm text-slate-400 max-w-xs mt-2 leading-relaxed m-0" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.01em' }}>
                                        or click anywhere within the dashed layout container to manually browse files.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* LOGIC MATRICES & EXPLANATION SUB-CONTAINER */}
                {!dataset && (
                    <div className="mt-12 w-full">
                        <div className="bg-amber-50/70 border border-amber-400 rounded-xl p-6 space-y-3 shadow-3xs">
                            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide m-0" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.04em' }}>
                                Processing Logic
                            </h4>
                            <p className="text-slate-700 text-sm leading-relaxed mt-2 m-0" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-0.02em' }}>
                                This workspace environment standardizes datasets automatically by eliminating row duplicates, adjusting format padding, and mapping missing fields. Any missing values are filled with <code className="text-amber-800 font-mono bg-amber-100/80 px-2 py-0.5 rounded text-xs font-bold">"UNKNOWN"</code> instead of guessing the data, helping prevent incorrect results. Existing <code className="text-amber-800 font-mono bg-amber-100/80 px-2 py-0.5 rounded text-xs font-bold">"UNKNOWN"</code> values remain unchanged.
                            </p>
                        </div>
                    </div>
                )}

                {/* VISUAL CHARTS & LOG MATRIX GRIDS */}
                {dataset && !loading && (
                    <main className="space-y-8 mt-12 border-t border-slate-200 pt-12 animate-fade-in">

                        {/* Chart Category Selection Configurator */}
                        <section className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                                    Choose Horizontal Categories (X-Axis)
                                </label>
                                <select
                                    value={selectedLabel}
                                    onChange={(e) => setSelectedLabel(e.target.value)}
                                    className="w-full bg-slate-50 p-3 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                                >
                                    {dataset.columns.filter(c => c.dataType === 'Text').map(c => (
                                        <option key={c.systemKey} value={c.systemKey}>{c.displayLabel}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                                    Choose Vertical Values (Y-Axis)
                                </label>
                                <select
                                    value={selectedMetric}
                                    onChange={(e) => setSelectedMetric(e.target.value)}
                                    className="w-full bg-slate-50 p-3 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                                >
                                    {dataset.columns.filter(c => c.dataType === 'Numeric').map(c => (
                                        <option key={c.systemKey} value={c.systemKey}>{c.displayLabel}</option>
                                    ))}
                                </select>
                            </div>
                        </section>

                        {/* Interactive analytical charts rendering layer */}
                        <section className="bg-white border border-slate-200 p-4 sm:p-6 rounded-xl shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-4">
                                <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider m-0">Visual Analysis Rendering</h3>
                                <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full font-semibold font-mono self-start sm:self-auto">
                                    PAGE {currentPage} OF {totalPages}
                                </span>
                            </div>
                            <div className="h-64 w-full overflow-x-auto">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey={selectedLabel || undefined}
                                            stroke="#94a3b8"
                                            tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Arial' }}
                                            angle={-5}
                                            textAnchor="end"
                                            interval={0}
                                        />
                                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Arial' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', fontFamily: 'Arial' }}
                                            itemStyle={{ color: '#2563eb', fontSize: '11px', fontWeight: 600 }}
                                            labelStyle={{ color: '#0f172a', fontWeight: 'bold', fontSize: '11px' }}
                                        />
                                        <Bar dataKey={selectedMetric} fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={26} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${currentPage === 1
                                        ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                                        : "border-blue-200 bg-white text-blue-600 hover:bg-blue-50 shadow-2xs"
                                        }`}
                                >
                                    &larr; Prev
                                </button>

                                <span className="text-xs font-bold text-slate-400 font-mono">
                                    {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, dataset.cleanedRecords.length)} of {dataset.cleanedRecords.length}
                                </span>

                                <button
                                    type="button"
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${currentPage === totalPages
                                        ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                                        : "border-blue-200 bg-white text-blue-600 hover:bg-blue-50 shadow-2xs"
                                        }`}
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        </section>

                        {/* Cleaned tabular data streaming logs panel */}
                        <section className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
                            <div className="mb-4">
                                <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider m-0">Cleaned Data Logs (First 100 Records)</h3>
                            </div>
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <div className="max-h-56 overflow-y-auto">
                                    <table className="w-full border-collapse text-left text-xs text-slate-600 m-0 p-0">
                                        <thead className="bg-slate-100 text-slate-700 sticky top-0 uppercase border-b border-slate-200 z-10 font-bold text-[10px]">
                                            <tr>
                                                {dataset.columns.map((col) => (
                                                    <th key={col.systemKey} className="p-3 whitespace-nowrap min-w-[140px] border-r border-slate-200/50">
                                                        {col.displayLabel}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {dataset.cleanedRecords.slice(0, 100).map((row, rowIdx) => (
                                                <tr key={rowIdx} className="hover:bg-blue-50/10">
                                                    {dataset.columns.map((col) => {
                                                        const cellVal = row[col.systemKey];
                                                        return (
                                                            <td key={col.systemKey} className="p-2.5 whitespace-nowrap border-r border-slate-100 font-medium">
                                                                {typeof cellVal === 'number'
                                                                    ? cellVal.toLocaleString(undefined, { maximumFractionDigits: 3 })
                                                                    : String(cellVal)}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                    </main>
                )}
            </div>
        </div>
    );
}