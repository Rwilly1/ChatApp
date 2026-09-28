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
const dmPanel = document.getElementById('dm-panel');
const dmMessagesContainer = document.getElementById('dm-messages-container');
const dmForm = document.getElementById('dm-form');
const dmInput = document.getElementById('dm-input');
const dmRecipientName = document.getElementById('dm-recipient-name');
const closeDmBtn = document.getElementById('close-dm');
const userContextMenu = document.getElementById('user-context-menu');
const sendDmOption = document.getElementById('send-dm-option');
let currentStatus = 'active';
let currentDmRecipient = null;
let dmMessages = {};
let unreadDmCounts = {};
// Usernames rendered in the sidebar as of the last updateUserList() call, so
// a status-only change (which re-broadcasts the whole roster) doesn't replay
// the entrance animation on people who were already there.
let knownUserList = new Set();

// Other users' message bubble background (own-message color is set in CSS
// via .message.own/.dm-message.own). Username/message text stays the
// default grey for both - only the bubble background carries the color.
const OTHER_BUBBLE_COLOR = 'rgba(85, 23, 173, 0.16)';

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
            typingIndicator.innerHTML = `${escapeHtml(data.username)} is typing${dotsHtml()}`;
        } else {
            typingIndicator.textContent = '';
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        addSystemMessage('Disconnected from server', getCurrentTime());
    });

    socket.on('receive_dm', (data) => {
        handleDirectMessage(data);
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
        <div class="message-content">
            ${escapeHtml(decryptedMessage)}
        </div>
        <div class="message-header">
            <span class="message-username">${escapeHtml(data.username)}</span>
            <span class="message-timestamp">${data.timestamp}</span>
        </div>
    `;

    if (data.sender_id !== socket.id) {
        messageDiv.querySelector('.message-content').style.background = OTHER_BUBBLE_COLOR;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    animateIn(messageDiv, { opacity: 0, y: 12, scale: 0.96, duration: 0.35, ease: 'power2.out' });
}

// Add system message
function addSystemMessage(message, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = `${message} at ${timestamp}`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

// Animated "..." loading dots markup, reused by the typing indicator and the
// waiting-for-users empty state
function dotsHtml() {
    return '<span class="loading-dots"><span></span><span></span><span></span></span>';
}

// GSAP entrance helper - falls back to a no-op if GSAP failed to load, so
// elements still render (just without the motion) rather than staying hidden
function animateIn(target, fromVars) {
    // Two conditions can leave a gsap.from() element stuck invisible forever:
    // (1) a backgrounded tab never runs requestAnimationFrame, and (2) the
    // server sends 'user_list_update' before 'join_confirmation', so the
    // very first roster render happens while #chat-screen is still
    // display:none - animating elements inside a hidden container doesn't
    // reliably resolve until something forces a re-layout (e.g. a tab
    // switch). Skip the animation and render normally in either case.
    if (window.gsap && !document.hidden && chatScreen.classList.contains('active')) {
        gsap.from(target, fromVars);
    }
}

// Status dropdown functionality
statusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    statusMenu.classList.toggle('show');
    if (statusMenu.classList.contains('show')) {
        animateIn(statusMenu, { opacity: 0, scale: 0.9, y: -6, duration: 0.18, ease: 'power2.out' });
    }
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

// DM Form handler
dmForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = dmInput.value.trim();
    if (!message || !currentDmRecipient) return;
    
    const encryptedMessage = encryptMessage(message, encryptionKey);
    
    if (!encryptedMessage) {
        alert('Failed to encrypt message');
        return;
    }
    
    socket.emit('send_dm', {
        recipient: currentDmRecipient,
        encrypted_message: encryptedMessage
    });
    
    dmInput.value = '';
});

// Close DM panel
closeDmBtn.addEventListener('click', () => {
    dmPanel.classList.remove('active');
    currentDmRecipient = null;
});

// Handle incoming direct messages
function handleDirectMessage(data) {
    const otherUser = data.sender === currentUser ? data.recipient : data.sender;
    
    if (!dmMessages[otherUser]) {
        dmMessages[otherUser] = [];
    }
    
    dmMessages[otherUser].push(data);
    
    if (currentDmRecipient === otherUser) {
        displayDmMessage({
            ...data,
            is_own: data.sender === currentUser
        });
    } else {
        // Increment unread count if not currently viewing this DM and it's from someone else
        if (data.sender !== currentUser) {
            if (!unreadDmCounts[otherUser]) {
                unreadDmCounts[otherUser] = 0;
            }
            unreadDmCounts[otherUser]++;
            updateUserListBadges();
        }
        console.log(`New DM from ${data.sender}`);
    }
}

// Display DM message
function displayDmMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'dm-message';
    
    if (data.is_own) {
        messageDiv.classList.add('own');
    }
    
    const decryptedMessage = decryptMessage(data.encrypted_message, encryptionKey);
    
    messageDiv.innerHTML = `
        <div class="dm-message-content">${escapeHtml(decryptedMessage)}</div>
        <div class="dm-message-info">${data.timestamp}</div>
    `;

    if (!data.is_own) {
        messageDiv.querySelector('.dm-message-content').style.background = OTHER_BUBBLE_COLOR;
    }

    dmMessagesContainer.appendChild(messageDiv);
    dmMessagesContainer.scrollTop = dmMessagesContainer.scrollHeight;
    animateIn(messageDiv, { opacity: 0, y: 10, scale: 0.96, duration: 0.3, ease: 'power2.out' });
}

// Open DM with user
function openDmWith(username) {
    if (username === currentUser) {
        alert("You can't send a message to yourself!");
        return;
    }
    
    currentDmRecipient = username;
    dmRecipientName.textContent = `DM: ${username}`;
    dmMessagesContainer.innerHTML = '';
    
    // Clear unread count for this user
    unreadDmCounts[username] = 0;
    updateUserListBadges();
    
    if (dmMessages[username]) {
        dmMessages[username].forEach(msg => {
            displayDmMessage({
                ...msg,
                is_own: msg.sender === currentUser
            });
        });
    }
    
    dmPanel.classList.add('active');
    dmInput.focus();
}

// Update user list with context menu support
function updateUserList(users) {
    userList.innerHTML = '';

    if (!users || users.length <= 1) {
        const li = document.createElement('li');
        li.innerHTML = `Waiting for others${dotsHtml()}`;
        li.style.fontStyle = 'italic';
        li.style.color = '#999';
        userList.appendChild(li);
        knownUserList = new Set(users ? users.map(u => u.username || 'Unknown User') : []);
        return;
    }

    const newRows = [];

    users.forEach(user => {
        const li = document.createElement('li');
        const username = user.username || 'Unknown User';

        // Add data attribute for reliable username identification
        li.dataset.username = username;

        if (!knownUserList.has(username)) {
            newRows.push(li);
        }
        
        const statusIndicator = document.createElement('span');
        statusIndicator.className = `status-indicator ${user.status || 'active'}`;
        
        const usernameText = document.createTextNode(` ${username}`);
        
        li.appendChild(statusIndicator);
        li.appendChild(usernameText);
        
        // Add notification badge if there are unread DMs
        if (unreadDmCounts[username] && unreadDmCounts[username] > 0) {
            const badge = document.createElement('span');
            badge.className = 'dm-notification-badge';
            badge.textContent = unreadDmCounts[username];
            li.appendChild(badge);
        }
        
        if (username === currentUser) {
            li.style.fontWeight = 'bold';
        }
        
        if (username !== currentUser && users.length > 2) {
            li.classList.add('dm-enabled');
            li.title = 'Click to send a direct message';
            li.addEventListener('click', () => {
                openDmWith(username);
            });
        }
        
        userList.appendChild(li);
    });

    if (newRows.length > 0) {
        animateIn(newRows, {
            opacity: 0,
            x: -10,
            stagger: 0.05,
            duration: 0.3,
            ease: 'power2.out'
        });
    }

    knownUserList = new Set(users.map(u => u.username || 'Unknown User'));
}

// Update user list badges without rebuilding entire list
function updateUserListBadges() {
    const userItems = userList.querySelectorAll('li[data-username]');
    userItems.forEach(li => {
        const username = li.dataset.username;
        if (!username) return;
        
        // Remove existing badge
        const existingBadge = li.querySelector('.dm-notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add new badge if needed
        if (unreadDmCounts[username] && unreadDmCounts[username] > 0) {
            const badge = document.createElement('span');
            badge.className = 'dm-notification-badge';
            badge.textContent = unreadDmCounts[username];
            li.appendChild(badge);
        }
    });
}

// Show context menu
function showContextMenu(event, username) {
    userContextMenu.style.left = `${event.pageX}px`;
    userContextMenu.style.top = `${event.pageY}px`;
    userContextMenu.classList.add('show');
    userContextMenu.dataset.username = username;
    animateIn(userContextMenu, { opacity: 0, scale: 0.9, duration: 0.15, ease: 'power2.out' });
}

// Hide context menu
document.addEventListener('click', (e) => {
    if (!userContextMenu.contains(e.target)) {
        userContextMenu.classList.remove('show');
    }
    statusMenu.classList.remove('show');
});

// Handle DM option click
sendDmOption.addEventListener('click', () => {
    const username = userContextMenu.dataset.username;
    if (username) {
        openDmWith(username);
        userContextMenu.classList.remove('show');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Secure Chat Application loaded');

    // Idle float on the login screen lock icon
    if (window.gsap) {
        gsap.to('.logo-icon', {
            y: -6,
            duration: 2.2,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1
        });
    }
});

// Browsers suspend requestAnimationFrame in backgrounded tabs, so a GSAP
// entrance animation (opacity/transform) that was mid-flight when the tab
// was hidden would otherwise stay stuck invisible until refocused. The
// instant the tab is hidden, snap any such element straight to its normal
// (fully visible, untransformed) CSS state so it's always correct by the
// time the user looks again.
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.gsap) {
        gsap.set('#user-list li, .message, .dm-message, #status-menu, #user-context-menu', {
            clearProps: 'opacity,transform'
        });
    }
});
