// Socket.IO connection
let socket;
let currentUser = null;
let currentRoom = null;
let encryptionKey = null;
let typingTimeout = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages-container');
const userList = document.getElementById('user-list');
const roomNameDisplay = document.getElementById('room-name');
const userNameDisplay = document.getElementById('user-name');
const leaveBtn = document.getElementById('leave-btn');
const generateKeyBtn = document.getElementById('generate-key-btn');
const typingIndicator = document.getElementById('typing-indicator');
const statusBtn = document.getElementById('status-btn');
const statusMenu = document.getElementById('status-menu');
let currentStatus = 'active';

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('connection_response', (data) => {
        console.log('Connection confirmed:', data);
    });

    socket.on('encryption_key', (data) => {
        // In a real app, this would be handled more securely
        console.log('Received encryption key from server');
    });

    socket.on('join_confirmation', (data) => {
        console.log('Joined room:', data.room);
        showChatScreen();
    });

    socket.on('user_joined', (data) => {
        addSystemMessage(`${data.username} joined the chat`, data.timestamp);
    });

    socket.on('user_left', (data) => {
        addSystemMessage(`${data.username} left the chat`, data.timestamp);
    });

    socket.on('user_list_update', (data) => {
        updateUserList(data.users);
    });

    socket.on('receive_message', (data) => {
        displayMessage(data);
    });

    socket.on('user_typing', (data) => {
        if (data.is_typing) {
            typingIndicator.textContent = `${data.username} is typing...`;
        } else {
            typingIndicator.textContent = '';
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        addSystemMessage('Disconnected from server', getCurrentTime());
    });
}

// AES Encryption/Decryption using CryptoJS
function encryptMessage(message, key) {
    try {
        const encrypted = CryptoJS.AES.encrypt(message, key).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

function decryptMessage(encryptedMessage, key) {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
        return plaintext || '[Decryption Failed]';
    } catch (error) {
        console.error('Decryption error:', error);
        return '[Decryption Failed]';
    }
}

// Generate random encryption key from backend
async function generateRandomKey() {
    try {
        const response = await fetch('/generate-key');
        const data = await response.json();
        return data.key;
    } catch (error) {
        console.error('Error generating key:', error);
        // Fallback to simple random key
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let key = '';
        for (let i = 0; i < 12; i++) {
            key += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return key;
    }
}

// Login form handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim();
    const key = document.getElementById('encryption-key').value.trim();
    
    if (!username || !room || !key) {
        alert('Please fill in all fields');
        return;
    }
    
    currentUser = username;
    currentRoom = room;
    encryptionKey = key;
    
    // Initialize socket if not already done
    if (!socket) {
        initializeSocket();
    }
    
    // Join the chat room
    socket.emit('join_chat', {
        username: username,
        room: room,
        encryption_key: key
    });
});

// Generate key button handler
generateKeyBtn.addEventListener('click', async () => {
    const key = await generateRandomKey();
    document.getElementById('encryption-key').value = key;
    
    // Copy to clipboard
    navigator.clipboard.writeText(key).then(() => {
        alert('Random key generated and copied to clipboard! Share this with other users.');
    }).catch(() => {
        alert('Random key generated! Please copy it manually.');
    });
});

// Message form handler
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Encrypt the message
    const encryptedMessage = encryptMessage(message, encryptionKey);
    
    if (!encryptedMessage) {
        alert('Failed to encrypt message');
        return;
    }
    
    // Send encrypted message to server
    socket.emit('send_message', {
        encrypted_message: encryptedMessage
    });
    
    // Clear input
    messageInput.value = '';
    
    // Stop typing indicator
    socket.emit('typing', { is_typing: false });
});

// Typing indicator
messageInput.addEventListener('input', () => {
    socket.emit('typing', { is_typing: true });
    
    // Clear previous timeout
    clearTimeout(typingTimeout);
    
    // Set new timeout to stop typing indicator
    typingTimeout = setTimeout(() => {
        socket.emit('typing', { is_typing: false });
    }, 1000);
});

// Leave chat button
leaveBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the chat?')) {
        socket.disconnect();
        location.reload();
    }
});

// Display message in chat
function displayMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    // Check if this is our own message
    if (data.sender_id === socket.id) {
        messageDiv.classList.add('own');
    }
    
    // Decrypt the message
    const decryptedMessage = decryptMessage(data.encrypted_message, encryptionKey);
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(data.username)}</span>
            <span class="message-timestamp">${data.timestamp}</span>
        </div>
        <div class="message-content">${escapeHtml(decryptedMessage)}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add system message
function addSystemMessage(message, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = `${message} at ${timestamp}`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Update user list
function updateUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        
        // Create status indicator
        const statusIndicator = document.createElement('span');
        statusIndicator.className = `status-indicator ${user.status || 'active'}`;
        
        // Create username text
        const usernameText = document.createTextNode(` ${user.username}`);
        
        li.appendChild(statusIndicator);
        li.appendChild(usernameText);
        
        if (user.username === currentUser) {
            li.style.fontWeight = 'bold';
        }
        userList.appendChild(li);
    });
}

// Show chat screen
function showChatScreen() {
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    roomNameDisplay.textContent = `Room: ${currentRoom}`;
    userNameDisplay.textContent = currentUser;
    messageInput.focus();
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Status dropdown functionality
statusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    statusMenu.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    statusMenu.classList.remove('show');
});

// Handle status selection
document.querySelectorAll('.status-option').forEach(option => {
    option.addEventListener('click', (e) => {
        const newStatus = e.currentTarget.dataset.status;
        updateStatus(newStatus);
        statusMenu.classList.remove('show');
    });
});

// Update user status
function updateStatus(status) {
    currentStatus = status;
    
    // Update button display
    const statusIndicator = statusBtn.querySelector('.status-indicator');
    const statusText = statusBtn.querySelector('.status-text');
    
    statusIndicator.className = `status-indicator ${status}`;
    statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Emit status change to server
    if (socket && socket.connected) {
        socket.emit('status_change', { status: status });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Secure Chat Application loaded');
});
