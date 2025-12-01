// ===== AI ASSISTANT PAGE JAVASCRIPT =====

// Use global API_BASE_URL from main.js
let chatHistory = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    setupChatHandlers();
    loadChatHistory();
    checkChatStatus();
});

// Load user info
function loadUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userData.name || userProfile.fullName) {
        const avatarUrl = userProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.fullName || userData.name || 'User')}&background=667eea&color=fff`;
        userAvatar.src = avatarUrl;
    }
}

// Check chat status and toggle quick questions
function checkChatStatus() {
    const messagesContainer = document.getElementById('chatMessages');
    const quickQuestionsPanel = document.getElementById('quickQuestionsPanel');
    
    // Count user messages (excluding first AI welcome message)
    const userMessages = messagesContainer.querySelectorAll('.user-message');
    
    if (userMessages.length === 0) {
        // No chat yet, show quick questions
        quickQuestionsPanel.style.display = 'block';
    } else {
        // Chat started, hide quick questions
        quickQuestionsPanel.style.display = 'none';
    }
}

// Setup chat handlers
function setupChatHandlers() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    
    chatForm.addEventListener('submit', handleSendMessage);
    
    // Auto-resize textarea on input
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Handle send message
async function handleSendMessage(e) {
    e.preventDefault();
    
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    chatInput.value = '';
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    
    // Hide quick questions after first message
    checkChatStatus();
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to AI
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../../index.html';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                message,
                context: getUserContext()
            })
        });
        
        const data = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        if (response.ok) {
            // Add AI response to UI
            addMessageToUI(data.response, 'ai');
            
            // Save to history
            chatHistory.push(
                { role: 'user', content: message, timestamp: new Date() },
                { role: 'ai', content: data.response, timestamp: new Date() }
            );
            saveChatHistory();
        } else {
            addMessageToUI('Xin lỗi, tôi không thể xử lý câu hỏi của bạn lúc này. Vui lòng thử lại sau.', 'ai');
        }
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessageToUI('Có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại.', 'ai');
    }
}

// Get user context for better AI responses
function getUserContext() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    return {
        role: userData.role || 'student',
        name: userProfile.fullName || userData.name || 'User'
    };
}

// Add message to UI
function addMessageToUI(text, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const time = new Date().toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    if (sender === 'ai') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${formatMessage(text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    } else {
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const avatarUrl = userProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.fullName || userData.name || 'User')}&background=667eea&color=fff`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <img src="${avatarUrl}" alt="Avatar" class="user-avatar">
            </div>
            <div class="message-content">
                <div class="message-text">${escapeHtml(text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Format AI message (support markdown-like formatting)
function formatMessage(text) {
    // Convert markdown links: [text](url) or [text](/path)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ai-link" target="_blank">$1 <i class="fas fa-external-link-alt"></i></a>');
    
    // Convert markdown-like syntax to HTML
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
    text = text.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>'); // Code blocks
    text = text.replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
    
    // Convert sections with headers
    text = text.replace(/^### (.+)$/gm, '<h4 class="ai-header">$1</h4>');
    text = text.replace(/^## (.+)$/gm, '<h3 class="ai-header">$1</h3>');
    text = text.replace(/^# (.+)$/gm, '<h2 class="ai-header">$1</h2>');
    
    // Split into lines for list processing
    const lines = text.split('\n');
    let inList = false;
    let listHtml = '';
    let resultLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if it's a list item
        if (line.match(/^(\d+\.|-|\*|✓|✅|📍|💰|⭐|🎓|📖|📚|🔗)\s+/)) {
            if (!inList) {
                inList = true;
                listHtml = '<ul class="ai-list">';
            }
            // Remove bullet point and add as list item
            const content = line.replace(/^(\d+\.|-|\*|✓|✅|📍|💰|⭐|🎓|📖|📚|🔗)\s+/, '');
            listHtml += `<li>${content}</li>`;
        } else {
            if (inList) {
                listHtml += '</ul>';
                resultLines.push(listHtml);
                listHtml = '';
                inList = false;
            }
            if (line) {
                resultLines.push(line);
            }
        }
    }
    
    // Close any open list
    if (inList) {
        listHtml += '</ul>';
        resultLines.push(listHtml);
    }
    
    text = resultLines.join('<br>');
    
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    
    // Highlight tutor names in format "**1. Name**" or "**Name**"
    text = text.replace(/<strong>(\d+\.\s)?([^<]+)<\/strong>/g, '<span class="tutor-name"><strong>$1$2</strong></span>');
    
    return text;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    indicator.style.display = 'flex';
}

// Hide typing indicator
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    indicator.style.display = 'none';
}

// Send quick question - Make globally accessible
window.sendQuickQuestion = function(question) {
    const chatInput = document.getElementById('chatInput');
    chatInput.value = question;
    document.getElementById('chatForm').dispatchEvent(new Event('submit'));
};

// Clear chat
function clearChat() {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="message ai-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">
                        Xin chào! Tôi là trợ lý AI của TutorMis. 👋
                        Tôi có thể giúp bạn tìm gia sư, hướng dẫn sử dụng website, và trả lời mọi câu hỏi của bạn về TutorMis.<br>
                        Bạn cần giúp đỡ gì hôm nay?
                    </div>
                    <div class="message-time">Bây giờ</div>
                </div>
            </div>
        `;
        chatHistory = [];
        localStorage.removeItem('aiChatHistory');
        // Show quick questions again
        checkChatStatus();
    }
}

// Export chat
function exportChat() {
    if (chatHistory.length === 0) {
        alert('Không có lịch sử chat để xuất');
        return;
    }
    
    let chatText = '=== TutorMis AI Chat Export ===\n\n';
    
    chatHistory.forEach(msg => {
        const time = new Date(msg.timestamp).toLocaleString('vi-VN');
        const sender = msg.role === 'user' ? 'Bạn' : 'AI';
        chatText += `[${time}] ${sender}:\n${msg.content}\n\n`;
    });
    
    // Create download link
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TutorMis_AI_Chat_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Save chat history to localStorage
function saveChatHistory() {
    try {
        localStorage.setItem('aiChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Load chat history from localStorage
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('aiChatHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);
            
            // Render saved messages (limit to last 20)
            const messagesContainer = document.getElementById('chatMessages');
            const recentHistory = chatHistory.slice(-20);
            
            // Clear welcome message if there's history
            if (recentHistory.length > 0) {
                messagesContainer.innerHTML = '';
            }
            
            recentHistory.forEach(msg => {
                addMessageToUI(msg.content, msg.role);
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}