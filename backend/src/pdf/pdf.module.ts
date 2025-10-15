import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PdfController } from "./pdf.controller";
import { PdfService } from "./pdf.service";
import { ExtractedData } from "./entities/extracted-data.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ExtractedData])],
  controllers: [PdfController],
  providers: [PdfService],
})
export class PdfModule {}
