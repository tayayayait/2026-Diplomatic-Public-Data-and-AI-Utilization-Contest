# Upload And Privacy

Phase 4 adds document upload processing for the new trip flow.

## Supported Files

- TXT: parsed as UTF-8 text.
- DOCX: extracts `word/document.xml` text nodes from the uploaded package.
- PDF: extracts visible literal text from simple text streams on a best-effort basis.
- JPG/PNG: accepted and validated, but local OCR is not implemented. Image itinerary extraction must be handled by the later Gemini multimodal hardening phase.

Limits:

- Maximum 5 files per upload.
- Maximum 10MB per file.
- Supported extensions only: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.txt`, `.docx`.

## Privacy Controls

The upload pipeline does not persist the original uploaded file. Browser code sends file bytes to a server function, the server extracts text in memory, then returns only extracted text and file metadata.

Before extracted text is shown in the form or sent to Gemini, these identifiers are replaced:

- Korean resident registration numbers
- Passport-like numbers
- Mobile phone numbers
- Email addresses

The UI shows a redaction summary so the user can verify that sensitive identifiers were removed.
