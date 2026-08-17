'use client';
import { useState, useRef, KeyboardEvent } from 'react';
import {
  Send, Paperclip, Smile, Mic, Image as ImageIcon,
  FileText, X, ChevronDown,
} from 'lucide-react';
import { MessageType } from '@/types';
import { uploadsApi } from '@/services/api';
import { templatesApi } from '@/services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface MessageInputProps {
  onSend: (data: { type: MessageType; content?: string; mediaUrl?: string; caption?: string; metadata?: any }) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await onSend({ type: MessageType.TEXT, content: trimmed });
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch {
      toast.error('فشل إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadsApi.upload(file);

      let type = MessageType.DOCUMENT;
      if (file.type.startsWith('image/')) type = MessageType.IMAGE;
      else if (file.type.startsWith('video/')) type = MessageType.VIDEO;
      else if (file.type.startsWith('audio/')) type = MessageType.AUDIO;

      await onSend({
        type,
        mediaUrl: result.url,
        metadata: { fileName: result.originalName, mimeType: result.mimeType, size: result.size },
      });
    } catch {
      toast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await templatesApi.list({ limit: 50 });
      setTemplates(response.data || []);
      setShowTemplates(true);
    } catch {}
  };

  const applyTemplate = (template: any) => {
    setText(template.content);
    setShowTemplates(false);
    templatesApi.use(template.id).catch(() => {});
    textareaRef.current?.focus();
  };

  const filteredTemplates = templates.filter(t =>
    !templateSearch || t.name.includes(templateSearch) || t.content.includes(templateSearch),
  );

  return (
    <div className="relative">
      {showTemplates && (
        <div className="absolute bottom-full mb-2 right-0 left-0 bg-white dark:bg-[#1f2c33] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2a3942] max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-200 dark:border-[#2a3942] flex items-center gap-2">
            <input
              type="text"
              placeholder="بحث في القوالب..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="flex-1 text-sm bg-gray-100 dark:bg-[#202c33] rounded-lg px-3 py-1.5 outline-none dark:text-white"
              autoFocus
            />
            <button onClick={() => setShowTemplates(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredTemplates.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 text-center">لا توجد قوالب</p>
            ) : (
              filteredTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="w-full text-right p-3 hover:bg-gray-50 dark:hover:bg-[#202c33] border-b border-gray-100 dark:border-[#2a3942]/50 transition-colors"
                >
                  <p className="text-sm font-medium dark:text-white">{template.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{template.content}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#1f2c33] border-t border-gray-200 dark:border-[#2a3942] p-3">
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />

          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="p-2 text-gray-500 hover:text-[#25D366] hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg transition-colors disabled:opacity-50"
              title="إرفاق ملف"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={loadTemplates}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-[#25D366] hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg transition-colors disabled:opacity-50"
              title="قوالب الردود"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالة..."
            disabled={disabled}
            rows={1}
            className="flex-1 bg-gray-100 dark:bg-[#202c33] rounded-2xl px-4 py-2.5 text-sm outline-none resize-none max-h-[120px] dark:text-white dark:placeholder-gray-500 transition leading-relaxed"
            style={{ minHeight: '44px' }}
          />

          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending || disabled}
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all',
              text.trim() && !disabled
                ? 'bg-[#25D366] hover:bg-[#20ba5a] shadow-md'
                : 'bg-gray-200 dark:bg-[#2a3942]',
            )}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className={clsx('w-5 h-5 -rotate-90', text.trim() ? 'text-white' : 'text-gray-400')} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
