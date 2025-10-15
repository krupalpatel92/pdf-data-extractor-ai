import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractedData } from './entities/extracted-data.entity';
import OpenAI from 'openai';
import pdfParse = require('pdf-parse');

@Injectable()
export class PdfService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(ExtractedData)
    private extractedDataRepository: Repository<ExtractedData>,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async extractDataFromPdf(file: Express.Multer.File): Promise<ExtractedData> {
    try {
      console.log('Starting PDF extraction...');
      console.log('File size:', (file.buffer.length / 1024).toFixed(2), 'KB');

      // Parse PDF to extract text
      const pdfData = await pdfParse(file.buffer);
      const pdfText = pdfData.text;

      console.log('=== PDF Extraction Details ===');
      console.log('File name:', file.originalname);
      console.log('Extracted PDF text length:', pdfText.length, 'characters');
      console.log('Number of pages:', pdfData.numpages);
      console.log('First 500 characters:', pdfText.substring(0, 500));
      console.log('=============================');

      // Check if text is too long and needs chunking
      const MAX_CHARS = 100000; // Adjust based on your needs
      let extractedContent;

      if (pdfText.length > MAX_CHARS) {
        console.log('PDF text is large, processing in chunks...');
        extractedContent = await this.extractDataInChunks(pdfText);
      } else {
        extractedContent = await this.extractDataFromText(pdfText);
      }

      console.log('=== Extracted Structured Data (Before Flattening) ===');
      console.log(JSON.stringify(extractedContent, null, 2));
      console.log('====================================================');

      // Flatten the data for CSV-friendly format
      const flattenedContent = this.flattenForCSV(extractedContent);

      console.log('=== Flattened Data (CSV-Ready) ===');
      console.log(JSON.stringify(flattenedContent, null, 2));
      console.log('===================================');

      // Properly decode filename to handle UTF-8 characters
      let fileName = file.originalname;
      try {
        // Try to properly decode the filename if it was incorrectly encoded
        fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        console.log('Decoded filename:', fileName);
      } catch (error) {
        console.log('Using original filename:', fileName);
      }

      // Save to database
      const extractedData = this.extractedDataRepository.create({
        fileName: fileName,
        extractedContent: flattenedContent,
      });

      const savedData = await this.extractedDataRepository.save(extractedData);
      console.log('Data saved to database successfully');

      return savedData;
    } catch (error) {
      console.error('Error extracting data from PDF:', error);
      if (error.message?.includes('timeout')) {
        throw new Error('PDF processing timeout - file may be too large');
      }
      throw new Error(`Failed to extract data from PDF: ${error.message}`);
    }
  }

  private flattenForCSV(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (Array.isArray(value)) {
        // Convert array to multi-line text with line breaks
        flattened[newKey] = value.join('\n');
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        // Recursively flatten nested objects
        const nested = this.flattenForCSV(value, newKey);
        Object.assign(flattened, nested);
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  private async extractDataFromText(pdfText: string): Promise<any> {
    console.log('Calling OpenAI API...');

    const completion = await this.openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
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
            role: 'user',
            content: `Extract ALL data from this document using EXACT section titles and EXACT text. Do not invent or modify any wording:\n\n${pdfText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      },
      {
        timeout: 120000, // 2 minute timeout
      },
    );

    console.log('OpenAI API call completed');
    return JSON.parse(completion.choices[0].message.content);
  }

  private async extractDataInChunks(pdfText: string): Promise<any> {
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
      }),
    );

    // Merge all chunk results
    console.log('Merging chunk results...');
    return {
      document_info: {
        total_chunks: chunks.length,
        processing_note: 'Large document processed in multiple chunks',
      },
      chunks: chunkResults,
      merged_data: this.mergeChunkData(chunkResults),
    };
  }

  private mergeChunkData(chunks: any[]): any {
    // Simple merge - combine all unique keys from all chunks
    const merged: any = {};

    chunks.forEach((chunk, index) => {
      Object.keys(chunk).forEach((key) => {
        if (!merged[key]) {
          merged[key] = chunk[key];
        } else if (Array.isArray(merged[key]) && Array.isArray(chunk[key])) {
          merged[key] = [...merged[key], ...chunk[key]];
        } else if (
          typeof merged[key] === 'object' &&
          typeof chunk[key] === 'object'
        ) {
          merged[key] = { ...merged[key], ...chunk[key] };
        } else {
          merged[`${key}_chunk_${index + 1}`] = chunk[key];
        }
      });
    });

    return merged;
  }

  async getAllExtractedData(): Promise<ExtractedData[]> {
    return this.extractedDataRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getExtractedDataById(id: string): Promise<ExtractedData> {
    return this.extractedDataRepository.findOne({ where: { id } });
  }
}
