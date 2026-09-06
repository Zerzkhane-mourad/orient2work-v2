/** Administration des tests de validation (§5.3). */
import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { paginationSchema } from "../lib/pagination.js";
import { body, params } from "../middlewares/validate.js";
import * as testService from "../services/test.service.js";
import type {
  CreateTestInput,
  CreateTestQuestionInput,
  UpdateTestInput,
  UpdateTestQuestionInput,
} from "../validators/test.validator.js";

export async function list(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query);
  const result = await testService.list(pagination);
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await testService.getOne(id));
}

export async function create(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await testService.create(body<CreateTestInput>(req)), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await testService.update(id, body<UpdateTestInput>(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await testService.remove(id);
  sendNoContent(res);
}

export async function addQuestion(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await testService.addQuestion(id, body<CreateTestQuestionInput>(req)), 201);
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const { id, questionId } = params<{ id: string; questionId: string }>(req);
  sendSuccess(
    res,
    await testService.updateQuestion(id, questionId, body<UpdateTestQuestionInput>(req)),
  );
}

export async function removeQuestion(req: Request, res: Response): Promise<void> {
  const { id, questionId } = params<{ id: string; questionId: string }>(req);
  sendSuccess(res, await testService.removeQuestion(id, questionId));
}
