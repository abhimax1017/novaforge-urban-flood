import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { Location, PredictionData } from '../types';

interface AIAssistantProps {
  onClose: () => void;
  theme: 'light' | 'dark';
  location: Location;
  prediction: PredictionData;
}

export default function AIAssistant({ onClose, theme, location, prediction }: AIAssistantProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'I am NovaForge AI. Ask me about flood risks, drainage bottlenecks, or safe routing.' }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userMessage, 
          context: {
            location: location.name,
            coordinates: `${location.lat}, ${location.lng}`,
            timeOffset: prediction.timeOffsetMin,
            maxDepthCm: prediction.maxDepthCm,
            floodedArea: prediction.floodedAreaKm2,
            rainfallIntensity: prediction.rainfallIntensityMm
          }
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.answer || data.error || 'Failed to get response' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection to NovaForge AI failed.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "absolute bottom-24 right-8 w-[400px] border rounded-xl shadow-2xl flex flex-col overflow-hidden z-30 transition-colors",
      theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-700"
    )}>
      <div className={cn(
        "p-3 border-b flex items-center justify-between",
        theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-800 border-slate-700"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className={cn("font-bold text-sm", theme === 'light' ? "text-slate-800" : "text-white")}>NovaForge AI</div>
        </div>
        <button onClick={onClose} className={cn(
          "transition-colors p-1 rounded-md",
          theme === 'light' ? "text-slate-500 hover:text-slate-800 hover:bg-slate-200" : "text-slate-400 hover:text-white hover:bg-slate-700"
        )}>
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className={cn(
        "h-80 p-4 overflow-y-auto flex flex-col gap-4 text-sm",
        theme === 'light' ? "bg-slate-50/50" : "bg-slate-900/50"
      )}>
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "max-w-[85%] rounded-lg p-3",
            msg.role === 'user' 
              ? "bg-blue-600 text-white self-end shadow-md" 
              : (theme === 'light' ? "bg-white text-slate-700 border border-slate-200 self-start shadow-sm" : "bg-slate-800 text-slate-200 border border-slate-700 self-start")
          )}>
            {msg.role === 'ai' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && (
          <div className={cn(
            "border self-start rounded-lg p-3 flex items-center gap-2",
            theme === 'light' ? "bg-white border-slate-200 shadow-sm" : "bg-slate-800 border-slate-700"
          )}>
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className={cn("text-xs font-medium", theme === 'light' ? "text-slate-500" : "text-slate-400")}>Analyzing live telemetry...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={cn(
        "p-3 border-t flex gap-2",
        theme === 'light' ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900"
      )}>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask NovaForge AI..."
          className={cn(
            "flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
            theme === 'light' ? "bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" : "bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
          )}
        />
        <button type="submit" disabled={!query.trim() || loading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 rounded-md transition-colors shadow-md">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
