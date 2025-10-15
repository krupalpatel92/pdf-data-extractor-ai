import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PdfService } from "./pdf.service";

@Controller("api/pdf")
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post("extract")
  @UseInterceptors(FileInterceptor("file"))
  async extractData(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException("Only PDF files are allowed");
    }

    const result = await this.pdfService.extractDataFromPdf(file);
    return result;
  }

  @Get("all")
  async getAllExtractedData() {
    return this.pdfService.getAllExtractedData();
  }

  @Get(":id")
  async getExtractedDataById(@Param("id") id: string) {
    return this.pdfService.getExtractedDataById(id);
  }
}
