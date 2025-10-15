import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExtractedData } from "./entities/extracted-data.entity";
import OpenAI from "openai";
import * as pdfParse from "pdf-parse";

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
      // Parse PDF to extract text
      const pdfData = await pdfParse(file.buffer);
      const pdfText = pdfData.text;

      console.log("Extracted PDF text length:", pdfText.length);

      // Use OpenAI to extract structured data
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a data extraction assistant. Extract key information from the provided PDF text and return it as a structured JSON object. 
            Include any relevant fields such as: names, dates, amounts, addresses, or any other important data you can identify.
            Be flexible and adapt to the content of the document.`,
          },
          {
            role: "user",
            content: `Please extract structured data from this PDF text:\n\n${pdfText}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const extractedContent = JSON.parse(
        completion.choices[0].message.content,
      );

      // Save to database
      const extractedData = this.extractedDataRepository.create({
        fileName: file.originalname,
        extractedContent,
      });

      const savedData = await this.extractedDataRepository.save(extractedData);

      return savedData;
    } catch (error) {
      console.error("Error extracting data from PDF:", error);
      throw new Error("Failed to extract data from PDF");
    }
  }

  async getAllExtractedData(): Promise<ExtractedData[]> {
    return this.extractedDataRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async getExtractedDataById(id: string): Promise<ExtractedData> {
    return this.extractedDataRepository.findOne({ where: { id } });
  }
}
