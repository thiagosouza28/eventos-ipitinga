import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

export const validate =
  (schema: AnyZodObject, property: "body" | "query" | "params" = "body") =>
  (request: Request, _response: Response, next: NextFunction) => {
    schema.parse(request[property]);
    next();
  };
