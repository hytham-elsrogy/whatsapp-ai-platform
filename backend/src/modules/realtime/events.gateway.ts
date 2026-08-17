import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UsersService } from "@/modules/users/users.service";

interface JwtAccessPayload {
  sub: string;
  tenantId: string;
}

/**
 * Single Socket.IO gateway for the whole app — notifications, conversation
 * updates, etc. all go through here rather than each module opening its own
 * connection. Auth happens once at handshake (client sends the JWT access
 * token via `auth.token`, not a header — Socket.IO's handshake has no
 * Authorization header equivalent); there's no per-message re-validation, so
 * a connection survives its original token's 15m expiry. That's an accepted
 * simplification for this phase, not a security boundary — every mutating
 * action still goes through the normal HTTP API with its own JwtAuthGuard.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("missing token");

      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(
        token,
        {
          secret: this.configService.get<string>("jwt.accessSecret", ""),
        },
      );
      const user = await this.usersService.findById(payload.sub);
      if (
        !user ||
        user.status !== "active" ||
        user.tenantId !== payload.tenantId
      ) {
        throw new Error("invalid user");
      }

      client.data.userId = user.id;
      client.data.tenantId = user.tenantId;
      await client.join(`user:${user.id}`);
      await client.join(`tenant:${user.tenantId}`);
    } catch (error) {
      this.logger.warn(
        `Rejected socket connection: ${(error as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(): void {
    // Nothing to clean up — room membership is dropped automatically by Socket.IO.
  }

  @SubscribeMessage("conversation:join")
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ): void {
    if (typeof conversationId === "string")
      client.join(`conversation:${conversationId}`);
  }

  @SubscribeMessage("conversation:leave")
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ): void {
    if (typeof conversationId === "string")
      client.leave(`conversation:${conversationId}`);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToTenant(tenantId: string, event: string, payload: unknown): void {
    this.server?.to(`tenant:${tenantId}`).emit(event, payload);
  }

  emitToConversation(
    conversationId: string,
    event: string,
    payload: unknown,
  ): void {
    this.server?.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
