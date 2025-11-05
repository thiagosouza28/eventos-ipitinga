import { NextFunction, Request, Response } from "express";

/**
 * Middleware para normalizar o body da requisição
 * Garante que todos os valores de string sejam strings primitivas
 */
export const normalizeBody = (request: Request, _response: Response, next: NextFunction) => {
  if (request.body && typeof request.body === "object") {
    const normalized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(request.body)) {
      if (value === null || value === undefined) {
        normalized[key] = value;
      } else if (typeof value === "string") {
        // Se já é string, garantir que seja primitiva
        normalized[key] = String(value);
      } else if (typeof value === "object") {
        // Se for objeto, extrair apenas o valor do campo correspondente
        if (value && typeof value === "object") {
          // Se for array, normalizar cada item
          if (Array.isArray(value)) {
            normalized[key] = value.map(item => {
              if (typeof item === "string") {
                return String(item);
              } else if (item && typeof item === "object" && "value" in item) {
                return String(item.value);
              } else {
                return item;
              }
            });
          } else {
            // Se o objeto tem a propriedade com o mesmo nome da chave, usar ela
            // Ex: { name: "..." } quando key é "name"
            if (key in value && typeof value[key] === "string") {
              normalized[key] = String(value[key]);
            } else if ("value" in value) {
              normalized[key] = String(value.value);
            } else {
              // Tentar pegar o primeiro valor string do objeto
              const values = Object.values(value);
              const firstString = values.find((v: any) => typeof v === "string");
              if (firstString) {
                normalized[key] = String(firstString);
              } else {
                // Se não encontrar string, tentar serializar (mas não deve chegar aqui)
                normalized[key] = String(value);
              }
            }
          }
        }
      } else {
        // Outros tipos (number, boolean, etc)
        normalized[key] = value;
      }
    }
    
    request.body = normalized;
  }
  
  next();
};

