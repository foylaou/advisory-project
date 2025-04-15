//src/data-source.ts
import "reflect-metadata"
import { DataSource } from "typeorm"
import * as path from "path";
import { Survey } from "./entity/Survey";
import { Response } from "./entity/Response";
import { File } from "./entity/File";


export const AppDataSource = new DataSource({
    type: "mssql",
    host: "61.220.84.228",
    username: "foylaou0326",
    password: "t0955787053S",
    database: "advisory",
    synchronize: true,
    logging: false,
      options: {
    encrypt: true,                    // ✅ MSSQL 預設為加密，仍需保留
    trustServerCertificate: true     // ✅ 允許自簽憑證
  },
    entities: [File,Response,Survey],
     migrations: [path.join(__dirname, "migration", "**/*.ts")],
    subscribers: [],
})
