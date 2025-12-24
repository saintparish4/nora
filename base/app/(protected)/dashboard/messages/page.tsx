'use client';

import { useState } from 'react';
import { AuthProtected } from '@/components/auth-protected';
import { PatientSidebar } from '@/components/patient-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  Inbox, 
  Send, 
  PenSquare, 
  Search, 
  X,
  ChevronLeft,
  Clock,
  User,
  Paperclip
} from 'lucide-react';

// Mock messages data
const MOCK_MESSAGES = [
  {
    id: 1,
    from: 'Dr. Sarah Chen',
    subject: 'Lab Results Available',
    preview: 'Your recent lab work results are now available. Everything looks good overall...',
    date: '2024-01-15T10:30:00',
    unread: true,
    avatar: 'SC',
  },
  {
    id: 2,
    from: 'Nora Health Team',
    subject: 'Appointment Reminder',
    preview: 'This is a reminder for your upcoming appointment on January 20th at 2:30 PM...',
    date: '2024-01-14T14:00:00',
    unread: true,
    avatar: 'NH',
  },
  {
    id: 3,
    from: 'Dr. Michael Park',
    subject: 'Re: Follow-up Question',
    preview: 'Thank you for your question. Based on what you described, I would recommend...',
    date: '2024-01-12T09:15:00',
    unread: false,
    avatar: 'MP',
  },
  {
    id: 4,
    from: 'Billing Department',
    subject: 'Statement Ready',
    preview: 'Your January statement is now available. You can view it in your billing section...',
    date: '2024-01-10T11:00:00',
    unread: false,
    avatar: 'BD',
  },
  {
    id: 5,
    from: 'Dr. Sarah Chen',
    subject: 'Prescription Renewal',
    preview: 'I have renewed your prescription. You can pick it up at your pharmacy...',
    date: '2024-01-08T16:45:00',
    unread: false,
    avatar: 'SC',
  },
];

const MOCK_MESSAGE_DETAIL = {
  id: 1,
  from: 'Dr. Sarah Chen',
  to: 'You',
  subject: 'Lab Results Available',
  date: '2024-01-15T10:30:00',
  avatar: 'SC',
  body: `Hello,

Your recent lab work results are now available in your patient portal. I'm happy to report that everything looks good overall.

Here's a quick summary:
• Complete Blood Count (CBC): Within normal ranges
• Lipid Panel: Cholesterol levels are well-controlled
• Blood Glucose: Fasting glucose is normal

I'd recommend continuing with your current medications and lifestyle habits. Let's schedule a follow-up in 6 months to recheck these levels.

If you have any questions about your results, please don't hesitate to reach out.

Best regards,
Dr. Sarah Chen`,
};

type View = 'inbox' | 'detail' | 'compose';

export default function MessagesPage() {
  const [currentView, setCurrentView] = useState<View>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<typeof MOCK_MESSAGES[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: '',
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleSelectMessage = (message: typeof MOCK_MESSAGES[0]) => {
    setSelectedMessage(message);
    setCurrentView('detail');
  };

  const handleCompose = () => {
    setComposeData({ to: '', subject: '', body: '' });
    setCurrentView('compose');
  };

  const handleReply = () => {
    if (selectedMessage) {
      setComposeData({
        to: selectedMessage.from,
        subject: `Re: ${selectedMessage.subject}`,
        body: '',
      });
      setCurrentView('compose');
    }
  };

  const handleSend = () => {
    // Mock send action
    alert('Message sent! (This is a demo)');
    setCurrentView('inbox');
    setComposeData({ to: '', subject: '', body: '' });
  };

  const handleBack = () => {
    setCurrentView('inbox');
    setSelectedMessage(null);
  };

  const filteredMessages = MOCK_MESSAGES.filter(msg =>
    msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = MOCK_MESSAGES.filter(m => m.unread).length;

  return (
    <AuthProtected>
      <SidebarProvider suppressHydrationWarning>
        <PatientSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col h-full">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentView !== 'inbox' && (
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentView === 'compose' ? 'New Message' : 'Messages'}
                  </h1>
                  {currentView === 'inbox' && unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-sm font-medium rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {currentView === 'inbox' && (
                  <Button onClick={handleCompose} className="bg-rose-500 hover:bg-rose-600">
                    <PenSquare className="h-4 w-4 mr-2" />
                    Compose
                  </Button>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden bg-gray-50">
              {/* Inbox View */}
              {currentView === 'inbox' && (
                <div className="h-full flex flex-col">
                  {/* Search */}
                  <div className="p-4 bg-white border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message List */}
                  <div className="flex-1 overflow-y-auto">
                    {filteredMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Inbox className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                        <p className="text-gray-500">
                          {searchQuery ? 'Try a different search term' : 'Your inbox is empty'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredMessages.map((message) => (
                          <button
                            key={message.id}
                            onClick={() => handleSelectMessage(message)}
                            className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors ${
                              message.unread ? 'bg-rose-50/50' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                                message.unread 
                                  ? 'bg-rose-500 text-white' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {message.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-medium truncate ${message.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {message.from}
                                  </span>
                                  <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
                                    {formatDate(message.date)}
                                  </span>
                                </div>
                                <p className={`text-sm truncate ${message.unread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                  {message.subject}
                                </p>
                                <p className="text-sm text-gray-500 truncate mt-0.5">
                                  {message.preview}
                                </p>
                              </div>
                              {message.unread && (
                                <div className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message Detail View */}
              {currentView === 'detail' && selectedMessage && (
                <div className="h-full flex flex-col bg-white">
                  {/* Message Header */}
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      {MOCK_MESSAGE_DETAIL.subject}
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center text-white font-medium">
                        {MOCK_MESSAGE_DETAIL.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{MOCK_MESSAGE_DETAIL.from}</p>
                        <p className="text-sm text-gray-500">
                          To: {MOCK_MESSAGE_DETAIL.to}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(MOCK_MESSAGE_DETAIL.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-700 text-base leading-relaxed">
                        {MOCK_MESSAGE_DETAIL.body}
                      </pre>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex gap-3">
                      <Button onClick={handleReply} className="bg-rose-500 hover:bg-rose-600">
                        <Send className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button variant="outline">
                        Forward
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Compose View */}
              {currentView === 'compose' && (
                <div className="h-full flex flex-col bg-white">
                  <div className="flex-1 p-6 space-y-4">
                    {/* To Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={composeData.to}
                          onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                          placeholder="Select a provider or care team member"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Subject Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={composeData.subject}
                        onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                        placeholder="Enter subject"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      />
                    </div>

                    {/* Message Body */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <textarea
                        value={composeData.body}
                        onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                        placeholder="Type your message here..."
                        className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>

                  {/* Compose Actions */}
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach File
                      </Button>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={handleBack}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSend} 
                          className="bg-rose-500 hover:bg-rose-600"
                          disabled={!composeData.to || !composeData.subject || !composeData.body}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProtected>
  );
}
