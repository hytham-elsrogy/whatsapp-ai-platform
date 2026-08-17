import { ChatbotNodeType } from '@/types/chatbot';

export const NODE_LABELS: Record<ChatbotNodeType, string> = {
  start: 'بداية',
  message: 'رسالة',
  question: 'سؤال',
  button: 'أزرار',
  list: 'قائمة',
  condition: 'شرط',
  department: 'تحويل لقسم',
  agent: 'تحويل لموظف',
  ai: 'ذكاء اصطناعي',
  api_call: 'استدعاء API',
  db_query: 'استعلام بيانات',
  delay: 'تأخير',
  tag: 'وسم',
  end: 'نهاية',
};

const PALETTE_ITEMS: ChatbotNodeType[] = [
  'start',
  'message',
  'question',
  'button',
  'list',
  'condition',
  'department',
  'agent',
  'ai',
  'tag',
  'delay',
  'end',
];

export function NodePalette() {
  function handleDragStart(event: React.DragEvent, type: ChatbotNodeType) {
    event.dataTransfer.setData('application/chatbot-node-type', type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="w-48 flex-shrink-0 border-l border-gray-200 p-3 dark:border-gray-800">
      <p className="mb-2 text-xs font-medium text-gray-500">اسحب لإضافة عنصر</p>
      <div className="space-y-2">
        {PALETTE_ITEMS.map((type) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="cursor-grab rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm active:cursor-grabbing dark:border-gray-700 dark:bg-gray-900"
          >
            {NODE_LABELS[type]}
          </div>
        ))}
      </div>
    </aside>
  );
}
