import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : null;
    // Only an HttpException's own message is safe to forward — those are
    // deliberately written by application code for a client to see.
    // Anything else (a raw Postgres/TypeORM constraint error, a MinIO
    // client error, any unhandled exception) previously had its native
    // `.message` sent straight to the client, leaking internal table/
    // column/constraint names and query structure. The real detail is
    // still logged below either way.
    const message =
      body && typeof body === "object" && "message" in body
        ? (body as { message: string | string[] }).message
        : "Internal server error";

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        (exception as Error)?.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
