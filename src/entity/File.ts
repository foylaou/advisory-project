// src/entity/File.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn
} from "typeorm";
import { Response } from "./Response";

@Entity()
export class File {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Response, { onDelete: "CASCADE" })
  response!: Response;

  @Column()
  fileName!: string;

  @Column()
  fileType!: string;

  @Column()
  fileUrl!: string;

  @Column("int")
  fileSize!: number;

  @Column({ default: "attachment" }) // 可為 'signature' 或 'attachment'
  fileCategory!: string;

  @CreateDateColumn()
  uploadedAt!: Date;
}
