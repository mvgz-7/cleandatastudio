using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using CleanDataStudio.Server.Models;

namespace CleanDataStudio.Server.Controllers
{
    [ApiController]
    [Route("api/data")]
    public class DataController : ControllerBase
    {
        [HttpPost("process-dynamic")]
        public IActionResult ProcessDynamicCsv(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No data payload submitted.");

            var response = new ProfiledDatasetResponse();
            var rawRows = new List<string[]>();

            // Step 1: Ingest and split CSV lines properly respecting quotes
            using (var reader = new StreamReader(file.OpenReadStream()))
            {
                while (!reader.EndOfStream)
                {
                    var line = reader.ReadLine();
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        // FIXED: Replaced simple .Split(',') with a quote-aware parser
                        rawRows.Add(ParseCsvLine(line));
                    }
                }
            }

            if (rawRows.Count < 2)
                return BadRequest("Dataset contains inadequate dimensions for tracking.");

            // Step 2: Inspection and Column Header Token Normalization
            string[] originalHeaders = rawRows[0];
            var cleanHeaders = new List<string>();
            var columnTypes = new Dictionary<string, List<string>>();

            for (int i = 0; i < originalHeaders.Length; i++)
            {
                string rawHeader = originalHeaders[i];

                string cleanKey = string.IsNullOrWhiteSpace(rawHeader) || rawHeader.StartsWith("Unnamed")
                    ? $"FEATURE_{i}"
                    : Regex.Replace(rawHeader.Trim().ToUpper(), @"[^A-Z0-9_]", "_");

                cleanHeaders.Add(cleanKey);
                columnTypes[cleanKey] = new List<string>();
            }

            var dataPayload = rawRows.Skip(1).ToList();
            int initialCount = dataPayload.Count;

            // Step 3: Identify and drop duplicate rows
            var uniqueRows = dataPayload
                .GroupBy(row => string.Join("|", row))
                .Select(g => g.First())
                .ToList();

            response.HealthReport.DuplicatesRemovedCount = initialCount - uniqueRows.Count;

            // Step 4: Secondary Scan Matrix for Structural Type Inference
            foreach (string[] row in uniqueRows)
            {
                for (int colIdx = 0; colIdx < cleanHeaders.Count; colIdx++)
                {
                    if (colIdx < row.Length)
                    {
                        string val = row[colIdx] != null ? row[colIdx].Trim() : "";

                        // Backend replacement requirement
                        if (string.Equals(val, "ERROR", StringComparison.OrdinalIgnoreCase))
                        {
                            val = "UNKNOWN";
                        }

                        if (!string.IsNullOrEmpty(val))
                        {
                            columnTypes[cleanHeaders[colIdx]].Add(val);
                        }
                    }
                }
            }

            foreach (var header in cleanHeaders)
            {
                var samples = columnTypes[header].Take(20).ToList();
                string deducedType = "Text";

                if (samples.Count > 0 && samples.All(s => double.TryParse(Regex.Replace(s, @"[\$\s,₱]", ""), out _)))
                {
                    deducedType = "Numeric";
                }
                else if (samples.Count > 0 && samples.All(s => DateTime.TryParse(s, out _)))
                {
                    deducedType = "Temporal";
                }

                response.Columns.Add(new ColumnDefinition
                {
                    SystemKey = header,
                    DisplayLabel = header.Replace("_", " "),
                    DataType = deducedType
                });
            }

            // Step 5: Data Cleaning & Missing Value Imputation
            foreach (string[] row in uniqueRows)
            {
                var cleanedRecord = new Dictionary<string, object>();

                for (int colIdx = 0; colIdx < response.Columns.Count; colIdx++)
                {
                    var colDef = response.Columns[colIdx];

                    string rawValue = "";
                    if (colIdx < row.Length && row[colIdx] != null)
                    {
                        rawValue = row[colIdx].Trim();
                    }

                    if (string.Equals(rawValue, "ERROR", StringComparison.OrdinalIgnoreCase))
                    {
                        rawValue = "UNKNOWN";
                    }

                    if (colDef.DataType == "Numeric")
                    {
                        string scrubbedNumeric = Regex.Replace(rawValue, @"[\$\s,₱]", "");
                        if (double.TryParse(scrubbedNumeric, out double numericValue))
                        {
                            cleanedRecord[colDef.SystemKey] = numericValue;
                        }
                        else
                        {
                            cleanedRecord[colDef.SystemKey] = 0.0;
                            response.HealthReport.ImputedMissingValuesCount++;
                        }
                    }
                    else
                    {
                        cleanedRecord[colDef.SystemKey] = string.IsNullOrEmpty(rawValue) ? "UNKNOWN" : rawValue;
                        if (string.IsNullOrEmpty(rawValue))
                            response.HealthReport.ImputedMissingValuesCount++;
                    }
                }

                response.CleanedRecords.Add(cleanedRecord);
            }

            response.HealthReport.TotalRowsProcessed = response.CleanedRecords.Count;
            return Ok(response);
        }

        /// <summary>
        /// Parses a single CSV line while correctly handling embedded commas within quotes.
        /// </summary>
        private static string[] ParseCsvLine(string line)
        {
            var fields = new List<string>();
            bool inQuotes = false;
            var currentField = new System.Text.StringBuilder();

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];

                if (c == '"')
                {
                    // Handle escaped quotes inside quotes ("")
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        currentField.Append('"');
                        i++; // Skip next quote
                    }
                    else
                    {
                        inQuotes = !inQuotes; // Toggle quote state
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    fields.Add(currentField.ToString());
                    currentField.Clear();
                }
                else
                {
                    currentField.Append(c);
                }
            }

            // Add final field remaining
            fields.Add(currentField.ToString());

            return fields.ToArray();
        }
    }
}