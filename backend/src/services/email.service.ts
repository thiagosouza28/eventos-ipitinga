import nodemailer from "nodemailer";

import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  }
});

type SendTemporaryPasswordPayload = {
  to: string;
  name: string;
  temporaryPassword: string;
};

const buildTemporaryPasswordHtml = (name: string, password: string) => {
  const firstName = name?.split(" ")?.[0] ?? "Diretor(a)";
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; background-color: #0b1120; padding: 32px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background: radial-gradient(circle at top, #1d2440, #0b1120); border-radius: 24px; padding: 32px; color: #f4f6fb;">
            <tr>
              <td align="center" style="padding-bottom: 16px;">
                <div style="font-size: 18px; letter-spacing: 0.4em; text-transform: uppercase; color: #8ba8ff;">
                  CATRE Ipitanga
                </div>
                <h1 style="margin: 12px 0 0; font-size: 28px;">Recuperação de acesso</h1>
              </td>
            </tr>
            <tr>
              <td style="font-size: 15px; line-height: 1.6; color: #d7defb;">
                <p>Olá, ${firstName}!</p>
                <p>Recebemos uma solicitação para gerar uma nova senha temporária para seu acesso ao painel administrativo do CATRE Ipitanga.</p>
                <p style="margin: 24px 0;">
                  <span style="display: block; font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; color: #94a3f7; margin-bottom: 8px;">Senha temporária</span>
                  <span style="display: inline-block; padding: 16px 24px; font-size: 22px; font-weight: 600; letter-spacing: 0.2em; color: #0b1120; background: #C3DAFE; border-radius: 16px;">
                    ${password}
                  </span>
                </p>
                <p>Essa senha é válida por apenas uma utilização. Ao acessar o sistema, você será direcionado(a) automaticamente para criar uma nova senha definitiva.</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 24px; font-size: 13px; color: #94a3f7;">
                <p style="margin: 0;">Se você não solicitou essa alteração, entre em contato imediatamente com a equipe responsável.</p>
                <p style="margin: 12px 0 0;">CATRE Ipitanga &middot; Sistema de inscrições e check-in</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const emailService = {
  async sendTemporaryPasswordEmail(payload: SendTemporaryPasswordPayload) {
    const html = buildTemporaryPasswordHtml(payload.name, payload.temporaryPassword);
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: "Sua nova senha temporária - CATRE Ipitanga",
      html,
      text: `Olá ${payload.name},\n\nSua nova senha temporária é: ${payload.temporaryPassword}\nFaça login e troque a senha imediatamente.\n\nEquipe CATRE Ipitanga`
    });
  }
};

