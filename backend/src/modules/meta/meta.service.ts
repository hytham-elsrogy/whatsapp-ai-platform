import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export class MetaApiError extends Error {
  constructor(
    public statusCode: number,
    public metaCode?: number,
    message?: string,
  ) {
    super(message || "Meta API request failed");
  }
}

interface MetaSendResponse {
  messaging_product: "whatsapp";
  messages: { id: string }[];
}

/**
 * Thin wrapper around the WhatsApp Business Platform / Meta Cloud API.
 * The only place in the codebase that talks to graph.facebook.com — see
 * docs/architecture/05-meta-integration-architecture.md.
 */
@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly apiVersion: string;

  constructor(private readonly configService: ConfigService) {
    this.apiVersion = this.configService.get<string>(
      "meta.apiVersion",
      "v20.0",
    );
  }

  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    body: string,
  ): Promise<MetaSendResponse> {
    return this.post(phoneNumberId, accessToken, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    });
  }

  /** Sends an already-Meta-approved template — the only way to message a customer outside the 24h window. */
  async sendTemplateMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    templateName: string,
    language: string,
    variables: string[],
  ): Promise<MetaSendResponse> {
    return this.post(phoneNumberId, accessToken, {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        ...(variables.length
          ? {
              components: [
                {
                  type: "body",
                  parameters: variables.map((text) => ({ type: "text", text })),
                },
              ],
            }
          : {}),
      },
    });
  }

  /**
   * Submits a template to Meta for review via the WABA's message_templates
   * endpoint. Approval/rejection then arrives asynchronously via the
   * `message_template_status_update` webhook field, not this call's response.
   */
  async submitTemplate(
    wabaId: string,
    accessToken: string,
    params: {
      name: string;
      category: string;
      language: string;
      body: string;
      variableCount: number;
    },
  ): Promise<{ id: string; status: string }> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${wabaId}/message_templates`;
    const bodyComponent: Record<string, unknown> = {
      type: "BODY",
      text: params.body,
    };
    if (params.variableCount > 0) {
      bodyComponent.example = {
        body_text: [
          Array.from(
            { length: params.variableCount },
            (_, i) => `example_${i + 1}`,
          ),
        ],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.name,
        category: params.category.toUpperCase(),
        language: params.language,
        components: [bodyComponent],
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = payload?.error?.message || response.statusText;
      this.logger.warn(
        `Meta template submission ${response.status}: ${errorMessage}`,
      );
      throw new MetaApiError(
        response.status,
        payload?.error?.code,
        errorMessage,
      );
    }

    return { id: payload.id, status: payload.status ?? "PENDING" };
  }

  /**
   * Real WhatsApp interactive message shapes — "button" (max 3 quick-reply
   * buttons) or "list" (up to 10 rows total across sections). Meta rejects
   * anything past those limits, so callers must respect them; this method
   * validates rather than silently truncating, since a silently-dropped
   * option would desync the chatbot flow it belongs to.
   */
  async sendInteractiveMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    interactive:
      | {
          type: "button";
          bodyText: string;
          buttons: { id: string; title: string }[];
        }
      | {
          type: "list";
          bodyText: string;
          buttonText: string;
          rows: { id: string; title: string; description?: string }[];
        },
  ): Promise<MetaSendResponse> {
    if (interactive.type === "button" && interactive.buttons.length > 3) {
      throw new Error(
        `WhatsApp button messages support at most 3 buttons, got ${interactive.buttons.length}`,
      );
    }
    if (interactive.type === "list" && interactive.rows.length > 10) {
      throw new Error(
        `WhatsApp list messages support at most 10 rows, got ${interactive.rows.length}`,
      );
    }

    const action =
      interactive.type === "button"
        ? {
            buttons: interactive.buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          }
        : {
            button: interactive.buttonText,
            sections: [{ rows: interactive.rows }],
          };

    return this.post(phoneNumberId, accessToken, {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: interactive.type,
        body: { text: interactive.bodyText },
        action,
      },
    });
  }

  async markAsRead(
    phoneNumberId: string,
    accessToken: string,
    waMessageId: string,
  ): Promise<void> {
    await this.post(phoneNumberId, accessToken, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: waMessageId,
    });
  }

  /** Resolves a media_id from an inbound webhook to a short-lived (~5min) download URL. */
  async getMediaUrl(
    mediaId: string,
    accessToken: string,
  ): Promise<{ url: string; mimeType: string; fileSize: number }> {
    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = payload?.error?.message || response.statusText;
      this.logger.warn(`Meta media lookup ${response.status}: ${errorMessage}`);
      throw new MetaApiError(
        response.status,
        payload?.error?.code,
        errorMessage,
      );
    }
    return {
      url: payload.url,
      mimeType: payload.mime_type,
      fileSize: payload.file_size,
    };
  }

  /**
   * Downloads the actual media bytes. The URL from getMediaUrl() is
   * Meta-hosted and still requires the same bearer token — it is not a
   * public link, and expires quickly, so this must be called right after
   * getMediaUrl(), not cached for later.
   */
  async downloadMedia(
    url: string,
    accessToken: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      this.logger.warn(
        `Meta media download ${response.status}: ${response.statusText}`,
      );
      throw new MetaApiError(
        response.status,
        undefined,
        `Media download failed: ${response.statusText}`,
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      contentType:
        response.headers.get("content-type") || "application/octet-stream",
    };
  }

  private async post(
    phoneNumberId: string,
    accessToken: string,
    body: Record<string, unknown>,
  ): Promise<MetaSendResponse> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = payload?.error?.message || response.statusText;
      this.logger.warn(`Meta API ${response.status}: ${errorMessage}`);
      throw new MetaApiError(
        response.status,
        payload?.error?.code,
        errorMessage,
      );
    }

    return payload as MetaSendResponse;
  }
}
