using System.Collections.Generic;

namespace CleanDataStudio.Server.Models
{
    public class ProfiledDatasetResponse
    {
        // Holds metadata describing the discovered columns
        public List<ColumnDefinition> Columns { get; set; } = new();

        // Holds the automated cleaning counters for the UI panel
        public DataHealthSummary HealthReport { get; set; } = new();

        // Schema-agnostic storage representing the dynamic rows
        public List<Dictionary<string, object>> CleanedRecords { get; set; } = new();
    }

    public class ColumnDefinition
    {
        public string SystemKey { get; set; } = string.Empty;     // Code token (e.g., "GENE_001")
        public string DisplayLabel { get; set; } = string.Empty;   // Clean title (e.g., "GENE 001")
        public string DataType { get; set; } = string.Empty;       // "Numeric", "Temporal", or "Text"
    }

    public class DataHealthSummary
    {
        public int TotalRowsProcessed { get; set; }
        public int DuplicatesRemovedCount { get; set; }
        public int ImputedMissingValuesCount { get; set; }
    }
}