import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ChatbotFlow } from './entities/chatbot-flow.entity';
import { ChatbotNode } from './entities/chatbot-node.entity';
import { ChatbotEdge } from './entities/chatbot-edge.entity';
import { ChatbotSession } from './entities/chatbot-session.entity';
import { CreateFlowDto } from './dto/create-flow.dto';
import { SaveGraphDto } from './dto/save-graph.dto';

export interface FlowWithGraph extends ChatbotFlow {
  nodes: ChatbotNode[];
  edges: ChatbotEdge[];
}

@Injectable()
export class ChatbotFlowsService {
  constructor(
    @InjectRepository(ChatbotFlow)
    private readonly flowRepo: Repository<ChatbotFlow>,
    @InjectRepository(ChatbotNode)
    private readonly nodeRepo: Repository<ChatbotNode>,
    @InjectRepository(ChatbotEdge)
    private readonly edgeRepo: Repository<ChatbotEdge>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findAll(tenantId: string): Promise<ChatbotFlow[]> {
    return this.flowRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string): Promise<ChatbotFlow> {
    const flow = await this.flowRepo.findOne({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('Chatbot flow not found');
    return flow;
  }

  async findOneWithGraph(tenantId: string, id: string): Promise<FlowWithGraph> {
    const flow = await this.findOne(tenantId, id);
    const [nodes, edges] = await Promise.all([
      this.nodeRepo.find({ where: { flowId: id } }),
      this.edgeRepo.find({ where: { flowId: id } }),
    ]);
    return { ...flow, nodes, edges };
  }

  async findPublishedById(tenantId: string, id: string): Promise<ChatbotFlow | null> {
    return this.flowRepo.findOne({ where: { id, tenantId, status: 'published' } });
  }

  create(tenantId: string, userId: string, dto: CreateFlowDto): Promise<ChatbotFlow> {
    const flow = this.flowRepo.create({ ...dto, tenantId, createdById: userId });
    return this.flowRepo.save(flow);
  }

  async saveGraph(tenantId: string, flowId: string, dto: SaveGraphDto): Promise<FlowWithGraph> {
    await this.findOne(tenantId, flowId); // tenant-scope check

    if (!dto.nodes.some((n) => n.type === 'start')) {
      throw new BadRequestException('Flow must contain a "start" node');
    }
    const clientIds = new Set(dto.nodes.map((n) => n.clientId));
    for (const edge of dto.edges) {
      if (!clientIds.has(edge.sourceClientId) || !clientIds.has(edge.targetClientId)) {
        throw new BadRequestException('Edge references a node not present in this graph');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Nodes are fully replaced below (simplest correct approach for this
      // phase — no flow versioning yet, see docs/architecture/07-chatbot-architecture.md
      // § 5). Any conversation still mid-flow on the old nodes would violate
      // chatbot_sessions.current_node_id's FK once those nodes are deleted,
      // so end those sessions first — the customer falls back to human
      // routing rather than the request 500ing.
      await manager.update(
        ChatbotSession,
        { flowId, endedAt: IsNull() },
        { endedAt: new Date(), currentNodeId: null },
      );
      await manager.delete(ChatbotNode, { flowId }); // cascades to edges

      const idByClientId = new Map<string, string>();
      const savedNodes: ChatbotNode[] = [];
      for (const nodeInput of dto.nodes) {
        const saved = await manager.save(
          ChatbotNode,
          manager.create(ChatbotNode, {
            flowId,
            type: nodeInput.type as ChatbotNode['type'],
            config: nodeInput.config ?? {},
            positionX: nodeInput.positionX,
            positionY: nodeInput.positionY,
          }),
        );
        idByClientId.set(nodeInput.clientId, saved.id);
        savedNodes.push(saved);
      }

      const savedEdges: ChatbotEdge[] = [];
      for (const edgeInput of dto.edges) {
        const saved = await manager.save(
          ChatbotEdge,
          manager.create(ChatbotEdge, {
            flowId,
            sourceNodeId: idByClientId.get(edgeInput.sourceClientId),
            targetNodeId: idByClientId.get(edgeInput.targetClientId),
            condition: edgeInput.condition,
          }),
        );
        savedEdges.push(saved);
      }

      const flow = await manager.findOneOrFail(ChatbotFlow, { where: { id: flowId } });
      return { ...flow, nodes: savedNodes, edges: savedEdges };
    });
  }

  async publish(tenantId: string, id: string): Promise<ChatbotFlow> {
    const flow = await this.findOne(tenantId, id);
    const nodeCount = await this.nodeRepo.count({ where: { flowId: id } });
    if (nodeCount === 0) {
      throw new BadRequestException('Cannot publish an empty flow');
    }
    await this.flowRepo.update(id, { status: 'published' });
    return { ...flow, status: 'published' };
  }
}
