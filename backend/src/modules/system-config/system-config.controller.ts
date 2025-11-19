import { Request, Response } from "express";
import { z } from "zod";

import { systemConfigService } from "./system-config.service";

const colorScaleSchema = z.record(z.string().min(1));

const themeProfileSchema = z
  .object({
    palette: z
      .object({
        primary: colorScaleSchema.optional(),
        neutral: colorScaleSchema.optional()
      })
      .partial()
      .optional(),
    tokens: z
      .object({
        appBackground: z.string().optional(),
        shellBackground: z.string().optional(),
        surface: z.string().optional(),
        surfaceAlt: z.string().optional(),
        blurLayer: z.string().optional(),
        textBase: z.string().optional(),
        textMuted: z.string().optional(),
        border: z.string().optional(),
        accent: z.string().optional(),
        cardShadow: z.string().optional(),
        cardShadowStrong: z.string().optional(),
        gradientAccent: z.string().optional()
      })
      .partial()
      .optional(),
    support: z
      .object({
        info: z.string().optional(),
        success: z.string().optional(),
        warning: z.string().optional(),
        danger: z.string().optional()
      })
      .partial()
      .optional()
  })
  .partial();

const layoutSchema = z
  .object({
    borderRadius: z
      .object({
        sm: z.number().nonnegative().optional(),
        md: z.number().nonnegative().optional(),
        lg: z.number().nonnegative().optional(),
        pill: z.number().nonnegative().optional()
      })
      .partial()
      .optional(),
    spacing: z
      .object({
        xs: z.number().nonnegative().optional(),
        sm: z.number().nonnegative().optional(),
        md: z.number().nonnegative().optional(),
        lg: z.number().nonnegative().optional(),
        xl: z.number().nonnegative().optional()
      })
      .partial()
      .optional(),
    containerWidth: z.number().positive().optional()
  })
  .partial();

const componentsSchema = z
  .object({
    button: z
      .object({
        borderRadius: z.number().nonnegative().optional(),
        paddingX: z.number().nonnegative().optional(),
        paddingY: z.number().nonnegative().optional(),
        fontWeight: z.number().optional(),
        shadow: z.string().optional(),
        borderWidth: z.number().nonnegative().optional()
      })
      .partial()
      .optional(),
    input: z
      .object({
        borderRadius: z.number().nonnegative().optional(),
        borderWidth: z.number().nonnegative().optional(),
        borderColor: z.string().optional(),
        background: z.string().optional(),
        focusRing: z.string().optional(),
        shadow: z.string().optional()
      })
      .partial()
      .optional(),
    card: z
      .object({
        borderRadius: z.number().nonnegative().optional(),
        shadow: z.string().optional(),
        borderWidth: z.number().nonnegative().optional()
      })
      .partial()
      .optional(),
    modal: z
      .object({
        borderRadius: z.number().nonnegative().optional(),
        shadow: z.string().optional(),
        backdrop: z.string().optional(),
        animation: z.string().optional()
      })
      .partial()
      .optional()
  })
  .partial();

const updateSchema = z
  .object({
    branding: z
      .object({
        logoLightUrl: z.string().min(1).nullable().optional(),
        logoDarkUrl: z.string().min(1).nullable().optional(),
        fontFamily: z.string().min(2).optional(),
        headingFontFamily: z.string().min(2).optional()
      })
      .partial()
      .optional(),
    theme: z
      .object({
        light: themeProfileSchema.optional(),
        dark: themeProfileSchema.optional()
      })
      .partial()
      .optional(),
    typography: z
      .object({
        baseFontSize: z.number().min(10).max(24).optional(),
        scaleRatio: z.number().min(1).max(1.8).optional(),
        bodyLineHeight: z.number().min(1).max(2).optional(),
        headingLineHeight: z.number().min(1).max(2).optional(),
        letterSpacing: z.number().min(-2).max(2).optional()
      })
      .partial()
      .optional(),
    layout: layoutSchema.optional(),
    components: componentsSchema.optional(),
    reports: z
      .object({
        primaryColor: z.string().optional(),
        headerBackground: z.string().optional(),
        watermarkText: z.string().optional(),
        watermarkOpacity: z.number().min(0).max(1).optional(),
        fontFamily: z.string().optional(),
        accentColor: z.string().optional()
      })
      .partial()
      .optional()
  })
  .partial();

export const getPublicSystemConfigHandler = async (_request: Request, response: Response) => {
  const settings = await systemConfigService.getPublicConfig();
  return response.json(settings);
};

export const getAdminSystemConfigHandler = async (_request: Request, response: Response) => {
  const settings = await systemConfigService.getAdminConfig();
  return response.json(settings);
};

export const updateSystemConfigHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body ?? {});
  const settings = await systemConfigService.updateSettings(payload, request.user?.id);
  return response.json(settings);
};
