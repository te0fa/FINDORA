'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'model'
  text: string
}

interface ChatAssistantWidgetProps {
  reportId: string
  isRTL: boolean
  initialLockedState: boolean
}

export default function ChatAssistantWidget({
  reportId,
  isRTL,
  initialLockedState
}: ChatAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // System greeting when opening the widget for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeText = isRTL
        ? 'مرحباً! أنا المساعد الذكي لـ Findora. كيف يمكنني مساعدتك اليوم في مراجعة ومقارنة عروض الأسعار والموردين المتاحين في التقرير؟'
        : 'Hello! I am the Findora Sourcing Assistant. How can I help you compare and negotiate the sourced options in your report today?'
      setMessages([{ role: 'model', text: welcomeText }])
    }
  }, [isOpen, isRTL, messages.length])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userText = inputValue
    setInputValue('')
    
    // Add user message to state
    const newMessages = [...messages, { role: 'user', text: userText } as Message]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Build conversation history format for API (skip initial greeting)
      const chatHistory = messages
        .slice(1)
        .map(msg => ({
          role: msg.role,
          text: msg.text
        }))

      const response = await fetch(`/api/reports/${reportId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          history: chatHistory
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setMessages(prev => [...prev, { role: 'model', text: data.response }])
    } catch (err: any) {
      console.error(err)
      const errorText = isRTL
        ? 'عذراً، حدث خطأ أثناء الاتصال بمحرك الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.'
        : 'Sorry, an error occurred while connecting to the AI system. Please try again.'
      setMessages(prev => [...prev, { role: 'model', text: errorText }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 left-auto rtl:right-auto rtl:left-6 z-50">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-accent text-black flex items-center justify-center shadow-[0_4px_20px_rgba(200,151,59,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer font-black text-2xl border-none"
          title={isRTL ? 'مساعد التفاوض الذكي' : 'AI Sourcing Assistant'}
        >
          💬
        </button>
      )}

      {/* Glassmorphic Chat Panel */}
      {isOpen && (
        <div className="w-[360px] md:w-[400px] h-[500px] rounded-3xl border border-white/10 glass-card flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-accent/20 to-black/40 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-black font-black text-sm">
                🤖
              </div>
              <div className="text-left rtl:text-right">
                <h4 className="text-sm font-black text-white m-0 leading-tight">
                  {isRTL ? 'مساعد Findora الذكي' : 'Findora Sourcing AI'}
                </h4>
                <span className="text-[10px] text-accent font-bold uppercase tracking-wider">
                  {isRTL ? 'نشط الآن' : 'Always Active'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border-none cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent text-black rounded-tr-none font-bold'
                      : 'bg-white/5 text-white border border-white/5 rounded-tl-none'
                  }`}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 text-accent p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-black/60 border-t border-white/5 flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isRTL ? 'اسأل المساعد عن العروض المتاحة...' : 'Ask assistant about options...'
              }
              className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-0"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-10 h-10 rounded-xl bg-accent text-black flex items-center justify-center font-bold shrink-0 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all border-none cursor-pointer"
            >
              {isRTL ? '←' : '→'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
