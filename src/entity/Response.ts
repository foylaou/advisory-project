// src/entity/Response.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn
} from "typeorm";
import { Survey } from "./Survey";

@Entity()
export class Response {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Survey, { onDelete: "CASCADE" })
  survey!: Survey;

  @Column("text")
  responseData!: string;

  @CreateDateColumn()
  submittedAt!: Date;
}
