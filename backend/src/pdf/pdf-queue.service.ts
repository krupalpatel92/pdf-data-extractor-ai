import { Injectable } from '@nestjs/common';
import { PdfService } from './pdf.service';

export interface QueueJob {
  id: string;
  file: Express.Multer.File;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class PdfQueueService {
  private queue: QueueJob[] = [];
  private isProcessing = false;

  constructor(private readonly pdfService: PdfService) {}

  async addToQueue(file: Express.Multer.File): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: QueueJob = {
      id: jobId,
      file,
      status: 'pending',
      createdAt: new Date(),
    };

    this.queue.push(job);
    console.log(
      `Job ${jobId} added to queue. Queue length: ${this.queue.length}`,
    );

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  private async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.find((j) => j.status === 'pending');

      if (!job) {
        break;
      }

      job.status = 'processing';
      console.log(
        `Processing job ${job.id}. Remaining in queue: ${this.queue.filter((j) => j.status === 'pending').length}`,
      );

      try {
        const result = await this.pdfService.extractDataFromPdf(job.file);
        job.result = result;
        job.status = 'completed';
        job.completedAt = new Date();
        console.log(`Job ${job.id} completed successfully`);
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        console.error(`Job ${job.id} failed:`, error.message);
      }

      // Clean up completed/failed jobs after 5 minutes
      setTimeout(
        () => {
          this.removeJob(job.id);
        },
        5 * 60 * 1000,
      );
    }

    this.isProcessing = false;
  }

  getJobStatus(jobId: string): QueueJob | null {
    return this.queue.find((job) => job.id === jobId) || null;
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter((j) => j.status === 'pending').length,
      processing: this.queue.filter((j) => j.status === 'processing').length,
      completed: this.queue.filter((j) => j.status === 'completed').length,
      failed: this.queue.filter((j) => j.status === 'failed').length,
    };
  }

  private removeJob(jobId: string) {
    const index = this.queue.findIndex((job) => job.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`Job ${jobId} removed from queue`);
    }
  }

  getAllJobs(): QueueJob[] {
    return this.queue;
  }
}
