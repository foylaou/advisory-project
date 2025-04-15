"use server";

import { AppDataSource } from "@/data-source";
import { Survey } from "@/entity/Survey";
import { Response as SurveyResponse } from "@/entity/Response";
import { File as SurveyFile } from "@/entity/File";
export async function getSurvey(codeOrUuid: string) {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const repo = AppDataSource.getRepository(Survey);

  // 先嘗試使用id查詢
  let survey = await repo.findOneBy({ id: codeOrUuid });

  // 如果沒找到，再使用code查詢
  if (!survey) {
    survey = await repo.findOneBy({ code: codeOrUuid });
  }

  if (!survey) return null;

  // 將實體轉換為純對象
  return {
    success: true,
    id:survey.id,
    jsonSchema: survey.jsonSchema,
  };
}


/**
 * 保存問卷回覆數據到資料庫
 * @param surveyId 調查問卷的唯一識別符
 * @param responseData 使用者提交的回覆數據（JSON字符串格式）
 * @returns 保存後的響應數據作為純對象
 * @throws Error 當找不到對應的調查問卷或發生數據庫錯誤時
 */
export async function saveResponse(surveyId: string, responseData: string) {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const surveyRepo = AppDataSource.getRepository(Survey);
  // 使用明确的类型
  const responseRepo = AppDataSource.getRepository(SurveyResponse);

  // 查找对应的 Survey
  const survey = await surveyRepo.findOneBy({ id: surveyId });
  if (!survey) {
    throw new Error("找不到对应的调查问卷");
  }

  // 创建新的 Response，使用重命名后的类型
  const response = new SurveyResponse();
  response.survey = survey;
  response.responseData = responseData;

  // 保存 Response
  const savedResponse = await responseRepo.save(response);

  // 将实体转换为纯对象
  return {
    success: true,
    id: savedResponse.id,
    surveyId: survey.id,
    responseData: savedResponse.responseData,
    submittedAt: savedResponse.submittedAt
  };
}


/**
 * 在事務中保存問卷回覆和PDF文件
 * @param surveyId 調查問卷的唯一識別符
 * @param responseData 回覆數據
 * @param pdfFileInfo PDF文件信息
 * @returns 保存後的回覆和文件信息
 */
export async function saveSurveyResponseWithPDF(
  surveyId: string,
  responseData: string,
  pdfFileInfo: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
  }
) {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // 開始事務
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 保存響應數據
    const responseRepo = queryRunner.manager.getRepository(SurveyResponse);
    const fileRepo = queryRunner.manager.getRepository(SurveyFile);
    const surveyRepo = queryRunner.manager.getRepository(Survey);

    // 查找對應的 Survey
    const survey = await surveyRepo.findOneBy({ id: surveyId });
    if (!survey) {
      throw new Error("找不到對應的調查問卷");
    }

    // 創建新的 Response
    const response = new SurveyResponse();
    response.survey = survey;
    response.responseData = responseData;

    // 保存 Response
    const savedResponse = await responseRepo.save(response);

    // 創建新的 File 記錄
    const file = new SurveyFile();
    file.response = savedResponse;
    file.fileName = pdfFileInfo.fileName;
    file.fileType = pdfFileInfo.fileType;
    file.fileUrl = pdfFileInfo.fileUrl;
    file.fileSize = pdfFileInfo.fileSize;
    file.fileCategory = "signature"; // 使用 signature 類別表示這是簽名後的 PDF

    // 保存 File
    const savedFile = await fileRepo.save(file);

    // 提交事務
    await queryRunner.commitTransaction();

    // 將實體轉換為純對象
    return {
      success: true,
      response: {
        id: savedResponse.id,
        surveyId: survey.id,
        responseData: savedResponse.responseData,
        submittedAt: savedResponse.submittedAt
      },
      file: {
        id: savedFile.id,
        responseId: savedResponse.id,
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        fileUrl: savedFile.fileUrl,
        fileSize: savedFile.fileSize,
        fileCategory: savedFile.fileCategory,
        uploadedAt: savedFile.uploadedAt
      }
    };
  } catch (error) {
    // 回滾事務
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // 釋放queryRunner
    await queryRunner.release();
  }
}
