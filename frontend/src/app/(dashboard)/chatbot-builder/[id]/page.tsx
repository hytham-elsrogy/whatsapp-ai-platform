'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowRight, Save, Send } from 'lucide-react';
import { chatbotService } from '@/services/chatbot';
import { ChatbotNodeType } from '@/types/chatbot';
import { NodePalette } from '@/components/chatbot-builder/node-palette';
import { FlowNode } from '@/components/chatbot-builder/flow-node';
import { NodeConfigPanel } from '@/components/chatbot-builder/node-config-panel';
import { api } from '@/lib/api';

interface NodeData extends Record<string, unknown> {
  chatbotType: ChatbotNodeType;
  config: Record<string, unknown>;
}

const nodeTypes = { flowNode: FlowNode };
let idCounter = 0;
function newClientId() {
  idCounter += 1;
  return `new-${Date.now()}-${idCounter}`;
}

function EdgeConditionBar({
  edge,
  onChange,
  onClose,
}: {
  edge: Edge;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const current = (edge.data as { condition?: { equals?: string } } | undefined)?.condition?.equals ?? '';
  return (
    <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-800 dark:bg-gray-900">
      <span className="text-gray-500">شرط الحافة (يساوي):</span>
      <input
        defaultValue={current}
        onBlur={(e) => onChange(e.target.value)}
        placeholder="اتركه فارغًا للمسار الافتراضي"
        className="w-56 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
      <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        إغلاق
      </button>
    </div>
  );
}

function BuilderCanvas() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [flowName, setFlowName] = useState('');
  const [flowStatus, setFlowStatus] = useState('draft');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ id: string; name: string }[]>('/departments').then(setDepartments);
    chatbotService.getFlow(params.id).then((flow) => {
      setFlowName(flow.name);
      setFlowStatus(flow.status);
      setNodes(
        flow.nodes.map((n) => ({
          id: n.id,
          type: 'flowNode',
          position: { x: n.positionX, y: n.positionY },
          data: { chatbotType: n.type, config: n.config },
        })),
      );
      setEdges(
        flow.edges.map((e) => ({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          data: { condition: e.condition },
          label: e.condition?.equals ? `= ${e.condition.equals}` : undefined,
        })),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, data: { condition: null } }, eds)),
    [setEdges],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/chatbot-node-type') as ChatbotNodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = newClientId();
      setNodes((nds) => [
        ...nds,
        { id, type: 'flowNode', position, data: { chatbotType: type, config: {} } },
      ]);
    },
    [screenToFlowPosition, setNodes],
  );

  function updateSelectedNodeConfig(config: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, config } } : n)),
    );
  }

  function deleteSelectedNode() {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  function updateSelectedEdgeCondition(value: string) {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === selectedEdgeId
          ? {
              ...e,
              data: { condition: value ? { equals: value } : null },
              label: value ? `= ${value}` : undefined,
            }
          : e,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await chatbotService.saveGraph(
        params.id,
        nodes.map((n) => ({
          clientId: n.id,
          type: n.data.chatbotType,
          config: n.data.config,
          positionX: n.position.x,
          positionY: n.position.y,
        })),
        edges.map((e) => ({
          sourceClientId: e.source,
          targetClientId: e.target,
          condition: (e.data as { condition?: { equals?: string } } | undefined)?.condition ?? undefined,
        })),
      );
      setMessage('تم الحفظ بنجاح');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    setMessage(null);
    try {
      await handleSave();
      const flow = await chatbotService.publish(params.id);
      setFlowStatus(flow.status);
      setMessage('تم النشر بنجاح');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل النشر');
    } finally {
      setSaving(false);
    }
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/chatbot-builder')} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <ArrowRight size={18} />
          </button>
          <span className="font-semibold">{flowName}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              flowStatus === 'published'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {flowStatus === 'published' ? 'منشورة' : 'مسودة'}
          </span>
          {message && <span className="text-xs text-gray-500">{message}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            <Save size={14} />
            حفظ
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            <Send size={14} />
            نشر
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {selectedNode ? (
          <NodeConfigPanel
            nodeType={selectedNode.data.chatbotType}
            config={selectedNode.data.config}
            departments={departments}
            onChange={updateSelectedNodeConfig}
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        ) : (
          <NodePalette />
        )}

        <div ref={wrapperRef} className="relative flex-1" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              setSelectedEdgeId(null);
              setSelectedNodeId(node.id);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedNodeId(null);
              setSelectedEdgeId(edge.id);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {selectedEdge && (
        <EdgeConditionBar
          edge={selectedEdge}
          onChange={updateSelectedEdgeCondition}
          onClose={() => setSelectedEdgeId(null)}
        />
      )}
    </div>
  );
}

export default function ChatbotBuilderPage() {
  return (
    <ReactFlowProvider>
      <BuilderCanvas />
    </ReactFlowProvider>
  );
}
