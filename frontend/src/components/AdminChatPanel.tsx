import { apiFetch } from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '@/store/trading-store';
import { Send, CheckCheck, MessageCircle, Search, X, Headphones, Paperclip, FileText, Image as ImageIcon, Download } from 'lucide-react';

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

interface ChatRoom {
  roomId: string;
  lastMessage: string;
  lastSender: string;
  lastSenderRole: string;
  lastAt: string;
  userName?: string;
  userEmail?: string;
  unreadCount?: number;
}

export default function AdminChatPanel({ socket }: { socket: any }) {
  const { user: admin } = useTradingStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; type: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<any>(null);

  const fetchRooms = async () => {
    try {
      const res = await apiFetch('/api/chat/rooms');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRooms(data);
        }
      }
    } catch {}
  };

  const fetchMessages = async () => {
    if (!selectedRoom) return;
    try {
      const res = await apiFetch(`/api/chat/messages?roomId=${encodeURIComponent(selectedRoom)}&role=admin`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchRooms();
    pollRef.current = setInterval(() => {
      fetchRooms();
      if (selectedRoom) fetchMessages();
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedRoom) fetchMessages();
  }, [selectedRoom]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_admin');
    if (selectedRoom) {
      socket.emit('join_room', selectedRoom.toLowerCase().trim());
    }
    const handleNewMessage = (msg: ChatMsg) => {
      if (!msg) return;
      const msgRoom = String(msg.chatRoomId || '').toLowerCase().trim();
      if (selectedRoom && selectedRoom.toLowerCase().trim() === msgRoom) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      fetchRooms();
    };
    socket.on('chat_message', handleNewMessage);
    socket.on('chat_message_global', handleNewMessage);
    return () => {
      socket.off('chat_message', handleNewMessage);
      socket.off('chat_message_global', handleNewMessage);
    };
  }, [socket, selectedRoom]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

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
      console.error('Admin file upload error:', err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || !selectedRoom || sending) return;
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
          chatRoomId: selectedRoom,
          senderRole: 'admin',
          senderName: admin?.name || 'Admin',
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
        fetchRooms();
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

  const filteredRooms = rooms.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
      (r.roomId && r.roomId.toLowerCase().includes(q)) ||
      (r.lastMessage && r.lastMessage.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex h-full overflow-hidden" style={{ background: '#0B141A' }}>
      <div
        className={`${selectedRoom ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col flex-shrink-0 border-r`}
        style={{ background: '#111B21', borderColor: '#222D34' }}
      >
        <div className="p-3 border-b flex items-center justify-between" style={{ background: '#202C33', borderColor: '#2A3942' }}>
          <div className="flex items-center gap-2">
            <Headphones size={20} style={{ color: '#00A884' }} />
            <h3 className="text-sm font-bold text-white">Support Chats</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#00A88420', color: '#00A884' }}>
            {rooms.length} Rooms
          </span>
        </div>
        <div className="p-2 border-b" style={{ borderColor: '#222D34' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#202C33' }}>
            <Search size={14} style={{ color: '#8696A0' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search user or message..."
              className="w-full text-xs outline-none bg-transparent"
              style={{ color: '#E9EDEF' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ color: '#8696A0' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#222D34]">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-12 text-xs opacity-50" style={{ color: '#8696A0' }}>
              No chats found
            </div>
          ) : (
            filteredRooms.map(room => {
              const isSelected = selectedRoom === room.roomId;
              return (
                <div
                  key={room.roomId}
                  onClick={() => setSelectedRoom(room.roomId)}
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#2A3942]' : 'hover:bg-[#202C33]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: '#3B82F6', color: '#fff' }}>
                    {(room.userName || room.roomId).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold truncate" style={{ color: '#E9EDEF' }}>
                        {room.userName || room.roomId}
                      </p>
                      <span className="text-[10px]" style={{ color: '#8696A0' }}>
                        {formatTime(room.lastAt)}
                      </span>
                    </div>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: '#8696A0' }}>
                      {room.lastSenderRole === 'admin' ? 'You: ' : ''}{room.lastMessage}
                    </p>
                  </div>
                  {!!room.unreadCount && room.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: '#00A884', color: '#fff' }}>
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      {selectedRoom ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#0B141A' }}>
          <div className="flex-shrink-0 flex items-center gap-3 px-4 h-14" style={{ background: '#202C33', borderBottom: '1px solid #2A3942' }}>
            <button
              onClick={() => setSelectedRoom(null)}
              className="md:hidden p-1 rounded hover:brightness-125"
              style={{ color: '#8696A0' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#2A3942', color: '#E9EDEF' }}>
              {selectedRoom.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selectedRoom}</p>
              <p className="text-[11px]" style={{ color: '#8696A0' }}>Customer</p>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:brightness-125"
              style={{ background: '#2A3942', color: '#8696A0' }}
            >
              <MessageCircle size={12} /> All Chats
            </button>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
            style={{ background: '#0B141A' }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                <MessageCircle size={40} style={{ color: '#8696A0' }} />
                <p className="text-xs" style={{ color: '#8696A0' }}>No messages in this conversation</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.senderRole === 'admin';
              const showLabel = i === 0 || messages[i - 1]?.senderRole !== msg.senderRole;
              const isImage = msg.attachmentType === 'image' || (msg.attachmentUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.attachmentUrl));
              const fullAttachmentUrl = msg.attachmentUrl ? (msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${import.meta.env.VITE_API_URL || 'https://api.optionaly.com'}${msg.attachmentUrl}`) : null;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showLabel ? 'mt-3' : ''}`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[65%] px-3 py-1.5 rounded-lg ${
                      isMe ? 'rounded-tr-none' : 'rounded-tl-none'
                    }`}
                    style={{
                      background: isMe ? '#005C4B' : '#202C33',
                    }}
                  >
                    {showLabel && (
                      <p
                        className={`text-[10px] font-semibold mb-0.5 ${isMe ? 'text-right' : 'text-left'}`}
                        style={{ color: isMe ? '#86EFAC' : '#F0B90B' }}
                      >
                        {isMe ? 'You (Admin)' : selectedRoom}
                      </p>
                    )}
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
                      <span className="text-[10px]" style={{ color: '#8696A0' }}>{formatTime(msg.createdAt)}</span>
                      {isMe && <CheckCheck size={14} style={{ color: '#53BDEB' }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
              placeholder={`Reply to ${selectedRoom}...`}
              className="flex-1 h-10 px-4 rounded-lg text-sm outline-none"
              style={{ background: '#2A3942', color: '#E9EDEF', border: '1px solid #3B4A54' }}
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
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-6" style={{ background: '#0B141A' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#202C33' }}>
            <MessageCircle size={32} style={{ color: '#8696A0' }} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Select a Conversation</h3>
          <p className="text-xs max-w-sm" style={{ color: '#8696A0' }}>
            Choose a customer room from the sidebar to reply to support tickets in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
