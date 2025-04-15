//src/data-source.ts
import "reflect-metadata"
import { DataSource } from "typeorm"
import * as path from "path";
import { Survey } from "./entity/Survey";
import { Response } from "./entity/Response";
import { File } from "./entity/File";

console.log("📦 TypeORM 設定：", {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  entities: [File.name, Response.name, Survey.name]
});
export const AppDataSource = new DataSource({
    type: "mssql",
    host: process.env.DB_HOST,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: false,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
      cryptoCredentialsDetails: {
          rejectUnauthorized: false
      }
  },
    entities: [File,Response,Survey],
     migrations: [path.join(__dirname, "migration", "**/*.ts")],
    subscribers: [],
})
