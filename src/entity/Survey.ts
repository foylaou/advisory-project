import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Survey {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ length: 255 })
  title!: string;

  @Column("text")
  jsonSchema!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updateAt!: Date;
}
