import { Handle, Position } from '@xyflow/react';
import { ChatbotNodeType } from '@/types/chatbot';
import { NODE_LABELS } from './node-palette';

const NODE_COLORS: Record<ChatbotNodeType, string> = {
  start: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950',
  message: 'border-sky-400 bg-sky-50 dark:bg-sky-950',
  question: 'border-sky-400 bg-sky-50 dark:bg-sky-950',
  button: 'border-purple-400 bg-purple-50 dark:bg-purple-950',
  list: 'border-purple-400 bg-purple-50 dark:bg-purple-950',
  condition: 'border-amber-400 bg-amber-50 dark:bg-amber-950',
  department: 'border-primary bg-primary/10',
  agent: 'border-primary bg-primary/10',
  ai: 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950',
  api_call: 'border-gray-400 bg-gray-50 dark:bg-gray-900',
  db_query: 'border-gray-400 bg-gray-50 dark:bg-gray-900',
  delay: 'border-gray-400 bg-gray-50 dark:bg-gray-900',
  tag: 'border-gray-400 bg-gray-50 dark:bg-gray-900',
  end: 'border-red-400 bg-red-50 dark:bg-red-950',
};

function preview(type: ChatbotNodeType, config: Record<string, unknown>): string {
  switch (type) {
    case 'message':
    case 'question':
      return String(config.text ?? '').slice(0, 40) || '(بدون نص)';
    case 'button':
    case 'list': {
      const options = (config.buttons ?? config.items ?? []) as Array<{ title: string }>;
      return options.length ? `${options.length} خيارات` : '(بدون خيارات)';
    }
    case 'condition':
      return String(config.variable ?? '(بدون متغير)');
    case 'department':
    case 'agent':
      return config.departmentId ? 'قسم محدد' : '(بدون قسم)';
    case 'delay':
      return `${config.seconds ?? 0} ثانية`;
    default:
      return '';
  }
}

export function FlowNode({ data, selected }: { data: { chatbotType: ChatbotNodeType; config: Record<string, unknown> }; selected: boolean }) {
  const { chatbotType, config } = data;
  return (
    <div
      className={`min-w-[160px] rounded-xl border-2 px-3 py-2 text-sm shadow-sm ${NODE_COLORS[chatbotType]} ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
    >
      {chatbotType !== 'start' && <Handle type="target" position={Position.Top} />}
      <div className="font-medium">{NODE_LABELS[chatbotType]}</div>
      <div className="mt-0.5 truncate text-xs text-gray-500">{preview(chatbotType, config)}</div>
      {chatbotType !== 'end' && chatbotType !== 'department' && chatbotType !== 'agent' && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
}
