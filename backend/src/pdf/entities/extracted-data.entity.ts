import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('extracted_data')
export class ExtractedData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  fileName: string;

  @Column('jsonb')
  extractedContent: any;

  @CreateDateColumn()
  createdAt: Date;
}
