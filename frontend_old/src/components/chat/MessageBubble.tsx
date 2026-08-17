'use client';
import { Check, CheckCheck, Clock, AlertCircle, Download, MapPin, Play, Pause } from 'lucide-react';
import { Message, MessageDirection, MessageType, MessageStatus } from '@/types';
import { formatMessageTime, formatFileSize } from '@/utils/format';
import { useState } from 'react';
import clsx from 'clsx';

interface MessageBubbleProps {
  message: Message;
  showSender?: boolean;
}

export function MessageBubble({ message, showSender }: MessageBubbleProps) {
  const isOutbound = message.direction === MessageDirection.OUTBOUND;

  return (
    <div className={clsx('flex mb-1 px-3 group', isOutbound ? 'justify-start' : 'justify-end')}>
      <div className={clsx(
        'max-w-[75%] min-w-[80px] relative',
        isOutbound ? 'msg-bubble-out' : 'msg-bubble-in',
        'rounded-xl px-3 py-2 shadow-sm',
        message.type === MessageType.IMAGE && 'p-1',
      )}>
        {showSender && message.sender && isOutbound && (
          <p className="text-[11px] font-medium text-[#25D366] mb-1">{message.sender.name}</p>
        )}

        <MessageContent message={message} />

        <div className={clsx(
          'flex items-center gap-1 mt-1',
          isOutbound ? 'justify-end' : 'justify-start',
        )}>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatMessageTime(message.createdAt)}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function MessageContent({ message }: { message: Message }) {
  switch (message.type) {
    case MessageType.TEXT:
      return (
        <p className="text-sm dark:text-white whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      );

    case MessageType.IMAGE:
      return (
        <div>
          <img
            src={message.mediaUrl}
            alt="صورة"
            className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer"
            onClick={() => window.open(message.mediaUrl, '_blank')}
          />
          {message.caption && (
            <p className="text-sm mt-1 px-2 pb-1 dark:text-white">{message.caption}</p>
          )}
        </div>
      );

    case MessageType.AUDIO:
      return <AudioMessage message={message} />;

    case MessageType.VIDEO:
      return (
        <div>
          <video
            src={message.mediaUrl}
            controls
            className="rounded-lg max-w-[250px] max-h-[200px]"
          />
          {message.caption && <p className="text-sm mt-1 dark:text-white">{message.caption}</p>}
        </div>
      );

    case MessageType.DOCUMENT:
      return (
        <a
          href={message.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-black/5 dark:bg-white/5 rounded-lg p-3 hover:bg-black/10 transition-colors min-w-[180px]"
        >
          <div className="w-10 h-10 bg-[#25D366]/20 rounded-lg flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-[#25D366]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium dark:text-white truncate">
              {message.fileName || 'مستند'}
            </p>
            <p className="text-xs text-gray-400">
              {message.fileSize ? formatFileSize(message.fileSize) : 'PDF'}
            </p>
          </div>
        </a>
      );

    case MessageType.LOCATION:
      return (
        <a
          href={`https://maps.google.com/?q=${message.latitude},${message.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg p-3 hover:bg-black/10 transition-colors"
        >
          <MapPin className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium dark:text-white">{message.locationName || 'الموقع الجغرافي'}</p>
            <p className="text-xs text-gray-400">انقر للعرض على الخريطة</p>
          </div>
        </a>
      );

    case MessageType.SYSTEM:
      return (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center">
          {message.content}
        </p>
      );

    default:
      return (
        <p className="text-sm dark:text-white">{message.content || `[${message.type}]`}</p>
      );
  }
}

function AudioMessage({ message }: { message: Message }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex items-center gap-3 min-w-[180px] p-1">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white" />
        ) : (
          <Play className="w-4 h-4 text-white ms-0.5" />
        )}
      </button>
      <div className="flex-1">
        <div className="flex gap-px items-end h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-[#25D366]/60 rounded-full flex-1"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case MessageStatus.PENDING:
      return <Clock className="w-3 h-3 text-gray-400" />;
    case MessageStatus.SENT:
      return <Check className="w-3 h-3 text-gray-400" />;
    case MessageStatus.DELIVERED:
      return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case MessageStatus.READ:
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case MessageStatus.FAILED:
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return null;
  }
}
