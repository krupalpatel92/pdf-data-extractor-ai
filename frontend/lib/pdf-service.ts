import OpenAI from "openai";
import { getDb, extractedData, type ExtractedData } from "./db";
import PDFParser from "pdf2json";

export class PdfService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async extractDataFromPdf(
    buffer: Buffer,
    fileName: string
  ): Promise<ExtractedData> {
    try {
      console.log("Starting PDF extraction...");
      console.log("File size:", (buffer.length / 1024).toFixed(2), "KB");

      // Parse PDF using pdf2json
      const pdfParser = new PDFParser();

      const pdfText = await new Promise<string>((resolve, reject) => {
        pdfParser.on(
          "pdfParser_dataError",
          (errData: Error | { parserError: Error }) => {
            const error =
              errData instanceof Error ? errData : errData.parserError;
            reject(error);
          }
        );

        pdfParser.on("pdfParser_dataReady", (pdfData) => {
          // Extract text manually from the data structure with proper error handling
          let text = "";

          try {
            if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
              for (const page of pdfData.Pages) {
                if (page.Texts && Array.isArray(page.Texts)) {
                  for (const textItem of page.Texts) {
                    if (textItem.R && Array.isArray(textItem.R)) {
                      for (const run of textItem.R) {
                        if (run.T) {
                          try {
                            // Try to decode, but fall back to raw text if it fails
                            text += decodeURIComponent(run.T) + " ";
                          } catch {
                            // If decoding fails, use the raw text
                            text += run.T + " ";
                          }
                        }
                      }
                    }
                  }
                  text += "\n";
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing PDF data:", parseError);
            // Fallback to getRawTextContent if manual parsing fails
            text = pdfParser.getRawTextContent() || "";
          }

          // If no text was extracted, try the built-in method
          if (!text || text.trim().length < 50) {
            console.log(
              "Manual extraction yielded little text, trying getRawTextContent..."
            );
            text = pdfParser.getRawTextContent() || text;
          }

          resolve(text);
        });

        pdfParser.parseBuffer(buffer);
      });

      // Estimate page count from text breaks
      const numPages =
        pdfText.split("--PAGE--").length ||
        Math.max(1, pdfText.split("\n\n\n").length);

      console.log("=== PDF Extraction Details ===");
      console.log("File name:", fileName);
      console.log("Extracted PDF text length:", pdfText.length, "characters");
      console.log("Number of pages:", numPages);
      console.log("First 1000 characters:", pdfText.substring(0, 1000));
      console.log(
        "Last 500 characters:",
        pdfText.substring(Math.max(0, pdfText.length - 500))
      );
      console.log("=============================");

      // Check if we got meaningful text
      if (pdfText.trim().length < 100) {
        throw new Error(
          "PDF text extraction failed - extracted text is too short. This might be a scanned PDF that requires OCR."
        );
      }

      // Check if text is too long and needs chunking
      const MAX_CHARS = 100000; // Adjust based on your needs
      let extractedContent: Record<string, unknown>;

      if (pdfText.length > MAX_CHARS) {
        console.log("PDF text is large, processing in chunks...");
        extractedContent = await this.extractDataInChunks(pdfText);
      } else {
        extractedContent = await this.extractDataFromText(pdfText);
      }

      console.log("=== Extracted Structured Data (Before Flattening) ===");
      console.log(JSON.stringify(extractedContent, null, 2));
      console.log("====================================================");

      // Flatten the data for CSV-friendly format
      const flattenedContent = this.flattenForCSV(extractedContent);

      console.log("=== Flattened Data (CSV-Ready) ===");
      console.log(JSON.stringify(flattenedContent, null, 2));
      console.log("===================================");

      // Use filename as-is (it's already properly encoded)
      console.log("Filename:", fileName);

      // Save to database using Drizzle ORM
      const db = getDb();
      const [savedData] = await db
        .insert(extractedData)
        .values({
          fileName: fileName,
          extractedContent: flattenedContent,
        })
        .returning();

      console.log("Data saved to database successfully");

      return savedData;
    } catch (error) {
      console.error("Error extracting data from PDF:", error);
      if (error instanceof Error && error.message?.includes("timeout")) {
        throw new Error("PDF processing timeout - file may be too large");
      }
      throw new Error(
        `Failed to extract data from PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private flattenForCSV(
    obj: Record<string, unknown>,
    prefix = ""
  ): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = "";
      } else if (Array.isArray(value)) {
        // Convert array to multi-line text with line breaks
        flattened[newKey] = value.join("\n");
      } else if (typeof value === "object" && !(value instanceof Date)) {
        // Recursively flatten nested objects
        const nested = this.flattenForCSV(
          value as Record<string, unknown>,
          newKey
        );
        Object.assign(flattened, nested);
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  private async extractDataFromText(
    pdfText: string
  ): Promise<Record<string, unknown>> {
    console.log("Calling OpenAI API...");

    const completion = await this.openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a precise data extraction assistant for German documents. Your goal is EXACT reproduction of the document structure and content.

CRITICAL RULES - MUST FOLLOW EXACTLY:

1. EXACT SECTION TITLES:
   - Use the EXACT German section titles from the document as JSON keys
   - Do NOT translate, paraphrase, or modify section names
   - Common sections in real estate documents: "Bestand", "Lage", "Objektdaten", "Objektdetails", "Energieausweis", "Hinweis & Courtage", "Allgemeine Geschäftsbedingungen", "DSGVO", "Geldwäschegesetz"
   - Keep capitalization exactly as it appears

2. EXACT TEXT REPRODUCTION:
   - Copy ALL text EXACTLY as written - do NOT invent, paraphrase, or modify any wording
   - Preserve ALL numbers, dates, addresses, amounts with exact formatting
   - Keep German special characters: ä, ö, ü, ß, Ä, Ö, Ü
   - Preserve punctuation, line breaks, and bullet points
   - If text is in a list format, keep it as an array

3. COMPLETE DATA - NO OMISSIONS:
   - Extract EVERY section visible in the document
   - Extract EVERY field, value, and text paragraph
   - Include ALL table rows and columns completely
   - Include ALL numbered terms and conditions
   - Include ALL legal disclaimers and fine print
   - If a section has subsections, preserve the hierarchy

4. TABLE DATA:
   - Extract complete tables with ALL fields
   - Preserve field names EXACTLY as shown
   - Keep all rows of data

5. FORBIDDEN - DO NOT:
   - Do NOT translate section titles to English
   - Do NOT summarize or shorten text
   - Do NOT invent data that's not in the source
   - Do NOT skip sections (except "Objektbilder" or pure image pages)
   - Do NOT paraphrase - use EXACT wording

6. OUTPUT FORMAT:
   {
     "document_title": "exact title from document",
     "property_id": "exact ID",
     "Bestand": { all bestand data exactly as shown },
     "Lage": { "Objektdaten": [...], "Objektdetails": "exact text" },
     "Energieausweis": { exact fields and values },
     "Hinweis & Courtage": { exact text },
     "Allgemeine Geschäftsbedingungen": [numbered items with exact text],
     "DSGVO": "exact text",
     "Geldwäschegesetz": "exact text",
     "Kontakt": { contact details }
   }

VERIFY: Before returning, check that you have NOT invented any text and have used EXACT section names from the source.`,
          },
          {
            role: "user",
            content: `Extract ALL data from this document using EXACT section titles and EXACT text. Do not invent or modify any wording:\n\n${pdfText}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      },
      {
        timeout: 120000, // 2 minute timeout
      }
    );

    console.log("OpenAI API call completed");
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    return JSON.parse(content) as Record<string, unknown>;
  }

  private async extractDataInChunks(
    pdfText: string
  ): Promise<Record<string, unknown>> {
    const CHUNK_SIZE = 80000;
    const chunks: string[] = [];

    for (let i = 0; i < pdfText.length; i += CHUNK_SIZE) {
      chunks.push(pdfText.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${chunks.length} chunks...`);

    const chunkResults = await Promise.all(
      chunks.map((chunk, index) => {
        console.log(`Processing chunk ${index + 1}/${chunks.length}...`);
        return this.extractDataFromText(chunk);
      })
    );

    // Merge all chunk results
    console.log("Merging chunk results...");
    return {
      document_info: {
        total_chunks: chunks.length,
        processing_note: "Large document processed in multiple chunks",
      },
      chunks: chunkResults,
      merged_data: this.mergeChunkData(chunkResults),
    };
  }

  private mergeChunkData(
    chunks: Record<string, unknown>[]
  ): Record<string, unknown> {
    // Simple merge - combine all unique keys from all chunks
    const merged: Record<string, unknown> = {};

    chunks.forEach((chunk, index) => {
      Object.keys(chunk).forEach((key) => {
        if (!merged[key]) {
          merged[key] = chunk[key];
        } else if (Array.isArray(merged[key]) && Array.isArray(chunk[key])) {
          merged[key] = [
            ...(merged[key] as unknown[]),
            ...(chunk[key] as unknown[]),
          ];
        } else if (
          typeof merged[key] === "object" &&
          typeof chunk[key] === "object" &&
          merged[key] !== null &&
          chunk[key] !== null
        ) {
          merged[key] = {
            ...(merged[key] as Record<string, unknown>),
            ...(chunk[key] as Record<string, unknown>),
          };
        } else {
          merged[`${key}_chunk_${index + 1}`] = chunk[key];
        }
      });
    });

    return merged;
  }
}
