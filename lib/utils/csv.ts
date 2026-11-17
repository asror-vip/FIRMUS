const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;
const PADDED_FORMULA_RE = /^[ ]+[=+\-@]/;

/**
 * Sanitizes a single CSV field against Excel/LibreOffice formula injection
 * and properly quotes/escapes double quotes per RFC 4180.
 */
export function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);
  if (FORMULA_PREFIX_RE.test(str) || PADDED_FORMULA_RE.test(str)) {
    str = `'${str}`;
  }

  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Triggers a client-side download of a UTF-8 BOM CSV file and cleans up the ObjectURL.
 */
export function downloadCsvBlob(filename: string, csvContent: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
