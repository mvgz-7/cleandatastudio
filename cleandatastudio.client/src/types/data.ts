export interface ColumnDefinition {
    systemKey: string;
    displayLabel: string;
    dataType: "Numeric" | "Temporal" | "Text";
}

export interface DataHealthSummary {
    totalRowsProcessed: number;
    duplicatesRemovedCount: number;
    imputedMissingValuesCount: number;
}

export interface ProfiledDatasetResponse {
    columns: ColumnDefinition[];
    healthReport: DataHealthSummary;
    // This flexible structure allows rows to possess any dynamic column properties
    cleanedRecords: Record<string, any>[];
}