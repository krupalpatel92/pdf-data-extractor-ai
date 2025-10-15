import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfModule } from './pdf/pdf.module';
import { ExtractedData } from './pdf/entities/extracted-data.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'pdf_extractor',
      entities: [ExtractedData],
      synchronize: true, // Set to false in production
      extra: {
        client_encoding: 'UTF8',
      },
    }),
    PdfModule,
  ],
})
export class AppModule {}
