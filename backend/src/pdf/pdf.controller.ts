import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PdfService } from './pdf.service';
import { PdfQueueService } from './pdf-queue.service';

@Controller('api/pdf')
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly queueService: PdfQueueService,
  ) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extractData(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const result = await this.pdfService.extractDataFromPdf(file);
    return result;
  }

  @Post('extract-batch')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async extractBatch(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const invalidFiles = files.filter(
      (file) => file.mimetype !== 'application/pdf',
    );
    if (invalidFiles.length > 0) {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const jobIds: string[] = [];
    for (const file of files) {
      const jobId = await this.queueService.addToQueue(file);
      jobIds.push(jobId);
    }

    return {
      message: `${files.length} file(s) added to processing queue`,
      jobIds,
      queueStatus: this.queueService.getQueueStatus(),
    };
  }

  @Get('queue/status')
  async getQueueStatus() {
    return this.queueService.getQueueStatus();
  }

  @Get('queue/job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = this.queueService.getJobStatus(jobId);
    if (!job) {
      throw new BadRequestException('Job not found');
    }
    return job;
  }

  @Get('queue/jobs')
  async getAllJobs() {
    return this.queueService.getAllJobs();
  }

  @Get('all')
  async getAllExtractedData() {
    return this.pdfService.getAllExtractedData();
  }

  @Get(':id')
  async getExtractedDataById(@Param('id') id: string) {
    return this.pdfService.getExtractedDataById(id);
  }
}
