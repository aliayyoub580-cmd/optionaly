
import { apiFetch } from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '@/store/trading-store';
import { Send, Check, CheckCheck, Paperclip, X, FileText, Image as ImageIcon, Download } from 'lucide-react';

interface ChatMsg {
  id: string;
  chatRoomId: string;
  senderRole: string;
  senderName: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  createdAt: string;
}

export default function ChatPanel({ socket }: { socket: any }) {
  const { user } = useTradingStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; type: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<any>(null);

  const getGuestId = () => {
    if (typeof window === 'undefined') return 'guest_user';
    let g = localStorage.getItem('trading_guest_id');
    if (!g) {
      g = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('trading_guest_id', g);
    }
    return g;
  };

  const userEmail = user?.email || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('trading_user') || '{}')?.email : '');
  const userId = user?.id || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('trading_user') || '{}')?.id : '');
  const roomId = (userEmail ? userEmail.toLowerCase().trim() : (userId ? String(userId).toLowerCase().trim() : getGuestId())).trim();
  const userName = user?.name || userEmail || 'Customer';

  // Fetch messages
  const fetchMessages = async () => {
    if (!roomId) return;
    try {
      const res = await apiFetch(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  // Real-time socket message handler
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('join_room', roomId);
    if (userId) socket.emit('join_room', String(userId).toLowerCase().trim());

    const handleNewMessage = (msg: ChatMsg) => {
      if (!msg) return;
      const msgRoom = String(msg.chatRoomId || '').toLowerCase().trim();
      const myRoom = roomId.toLowerCase();
      const myUserId = String(userId || '').toLowerCase().trim();

      if (msgRoom === myRoom || (myUserId && msgRoom === myUserId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('chat_message', handleNewMessage);
    socket.on('chat_message_global', handleNewMessage);
    return () => {
      socket.off('chat_message', handleNewMessage);
      socket.off('chat_message_global', handleNewMessage);
    };
  }, [socket, roomId, userId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Handle file select & upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('Only JPG, JPEG, and PNG image files are allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.optionaly.com';
      const res = await fetch(`${apiUrl}/api/chat/messages/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setAttachment({
          url: data.url,
          type: 'image',
          name: data.name,
          size: data.size,
        });
      } else {
        alert(data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('File upload error:', err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message
  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || !roomId || sending) return;
    setSending(true);
    const contentToSend = input.trim();
    const currentAttachment = attachment;
    setInput('');
    setAttachment(null);

    try {
      const res = await apiFetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatRoomId: roomId,
          senderRole: 'user',
          senderName: userName || 'Customer',
          content: contentToSend,
          attachmentUrl: currentAttachment?.url || null,
          attachmentType: currentAttachment?.type || null,
          attachmentName: currentAttachment?.name || null,
          attachmentSize: currentAttachment?.size || null,
        }),
      });
      if (res.ok) {
        const savedMsg = await res.json();
        setMessages(prev => {
          if (prev.some(m => m.id === savedMsg.id)) return prev;
          return [...prev, savedMsg];
        });
      } else {
        setInput(contentToSend);
        setAttachment(currentAttachment);
      }
    } catch {
      setInput(contentToSend);
      setAttachment(currentAttachment);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex-1 flex flex-col h-full" style={{ background: '#0B141A' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 h-14" style={{ background: '#202C33', borderBottom: '1px solid #2A3942' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#00A884', color: '#fff' }}>
          S
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Support Team</p>
          <p className="text-[11px]" style={{ color: '#8696A0' }}>Online</p>
        </div>
        <div className="w-2 h-2 rounded-full" style={{ background: '#00A884', boxShadow: '0 0 6px #00A884' }} />
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={{
          background: '#0B141A',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h60v60H0z\" fill=\"none\"/%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\" fill=\"%23ffffff08\"/%3E%3C/svg%3E")',
        }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#202C33' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: '#8696A0' }}>No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderRole === 'user';
          const showLabel = i === 0 || messages[i - 1]?.senderRole !== msg.senderRole;
          const isImage = msg.attachmentType === 'image' || (msg.attachmentUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.attachmentUrl));
          const fullAttachmentUrl = msg.attachmentUrl ? (msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${import.meta.env.VITE_API_URL || 'https://api.optionaly.com'}${msg.attachmentUrl}`) : null;

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showLabel ? 'mt-3' : ''}`}
            >
              <div
                className={`max-w-[80%] md:max-w-[65%] px-3 py-1.5 rounded-lg relative ${
                  isMe
                    ? 'rounded-tr-none'
                    : 'rounded-tl-none'
                }`}
                style={{
                  background: isMe ? '#005C4B' : '#202C33',
                }}
              >
                {showLabel && (
                  <p
                    className={`text-[10px] font-semibold mb-0.5 ${
                      isMe ? 'text-right' : 'text-left'
                    }`}
                    style={{ color: isMe ? '#86EFAC' : '#F0B90B' }}
                  >
                    {isMe ? 'You' : 'Support'}
                  </p>
                )}

                {/* Render Attachment if present */}
                {fullAttachmentUrl && (
                  <div className="mb-1.5 overflow-hidden rounded-lg">
                    {isImage ? (
                      <a href={fullAttachmentUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={fullAttachmentUrl}
                          alt="Attachment"
                          className="max-w-full max-h-60 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ) : (
                      <a
                        href={fullAttachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center gap-2 p-2 rounded-lg bg-black/20 hover:bg-black/40 transition-colors text-white"
                      >
                        <FileText size={20} className="text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-semibold truncate">{msg.attachmentName || 'Download File'}</p>
                          {msg.attachmentSize && <p className="text-[10px] text-gray-400">{formatFileSize(msg.attachmentSize)}</p>}
                        </div>
                        <Download size={16} className="text-gray-300 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                )}

                {msg.content && msg.content !== '[Image Attachment]' && msg.content !== '[File Attachment]' && (
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: '#E9EDEF' }}>
                    {msg.content}
                  </p>
                )}

                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px]" style={{ color: '#8696A0' }}>
                    {formatTime(msg.createdAt)}
                  </span>
                  {isMe && (
                    <CheckCheck size={14} style={{ color: '#53BDEB' }} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attachment Preview Bar */}
      {attachment && (
        <div className="px-3 py-2 flex items-center justify-between border-t" style={{ background: '#111B21', borderColor: '#2A3942' }}>
          <div className="flex items-center gap-2 text-xs text-emerald-400 truncate">
            {attachment.url ? (
              <img
                src={attachment.url.startsWith('http') ? attachment.url : `${import.meta.env.VITE_API_URL || 'https://api.optionaly.com'}${attachment.url}`}
                alt="Preview"
                className="w-10 h-10 rounded object-cover border border-emerald-500/30"
              />
            ) : (
              <ImageIcon size={18} />
            )}
            <div className="flex flex-col truncate">
              <span className="truncate font-semibold">{attachment.name}</span>
              <span className="text-[10px] text-gray-400">{formatFileSize(attachment.size)}</span>
            </div>
          </div>
          <button onClick={() => setAttachment(null)} className="p-1 text-gray-400 hover:text-white rounded-full bg-gray-800/50">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ background: '#202C33' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white disabled:opacity-50"
          title="Attach Image or Document"
        >
          <Paperclip size={20} className={uploading ? 'animate-spin' : ''} />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type a message..."
          className="flex-1 h-10 px-4 rounded-lg text-sm outline-none"
          style={{
            background: '#2A3942',
            color: '#E9EDEF',
            border: '1px solid #3B4A54',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={(!input.trim() && !attachment) || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40"
          style={{ background: '#00A884' }}
        >
          <Send size={18} style={{ color: '#fff' }} />
        </button>
      </div>
    </div>
  );
}
