<<<<<<< HEAD
# 🔒 Secure Chat Application

A real-time, end-to-end encrypted chat application built with Flask, Socket.IO, and AES encryption.

## Features

- **Real-time messaging** using WebSocket (Socket.IO)
- **End-to-end encryption** with AES-256 encryption
- **Multiple chat rooms** support
- **User presence** tracking (online users list)
- **Typing indicators** to show when users are typing
- **Modern UI** with responsive design
- **Key generation** tool for easy encryption key creation

## Architecture

### Backend (Python Flask)
- **Flask**: Web framework for serving the application
- **Flask-SocketIO**: WebSocket support for real-time communication
- **PyCryptodome**: AES encryption library (server-side utilities)

### Frontend (HTML/CSS/JavaScript)
- **Socket.IO Client**: Real-time bidirectional communication
- **CryptoJS**: Client-side AES encryption/decryption
- **Vanilla JavaScript**: No framework dependencies

### Security Model
- **AES-256 encryption** in CBC mode
- **Shared key encryption**: Users in the same room share an encryption key
- **Client-side encryption**: Messages are encrypted before transmission
- **Server never sees plaintext**: Server only routes encrypted messages

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd NetworkFinalProject
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. **Start the Flask server**
   ```bash
   python app.py
   ```

2. **Open your browser**
   - Navigate to `http://localhost:5000`
   - Or access from another device on the same network: `http://<your-ip>:5000`

3. **Join a chat room**
   - Enter your username
   - Enter a room name (e.g., "general")
   - Enter an encryption key or click "Generate Random Key"
   - Share the encryption key with other users who want to join the same room

## Usage Guide

### Creating a New Chat Room

1. Click "Generate Random Key" to create a secure encryption key
2. Copy the generated key (it's automatically copied to clipboard)
3. Share this key with friends via a secure channel (Signal, WhatsApp, etc.)
4. Enter your username and room name
5. Paste the encryption key
6. Click "Join Chat"

### Joining an Existing Room

1. Get the encryption key from the room creator
2. Enter the same room name as other participants
3. Enter the shared encryption key
4. Click "Join Chat"

### Sending Messages

- Type your message in the input field
- Press Enter or click "Send"
- Messages are automatically encrypted before sending
- Other users will decrypt messages using the shared key

## Project Structure

```
NetworkFinalProject/
├── app.py                  # Flask server with Socket.IO
├── crypto_utils.py         # Server-side encryption utilities
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── style.css          # Styling
    └── app.js             # Client-side JavaScript & encryption
```

## How It Works

### 1. Connection Flow
```
Client → Socket.IO Connection → Server
Client → Join Room Event → Server
Server → Encryption Key Exchange → Client
Server → User List Update → All Clients in Room
```

### 2. Message Flow
```
User types message
↓
Client encrypts with AES (shared key)
↓
Encrypted message sent via Socket.IO
↓
Server broadcasts to room (still encrypted)
↓
All clients receive encrypted message
↓
Each client decrypts with shared key
↓
Message displayed in chat
```

### 3. Encryption Process

**Encryption (Client-side)**
```javascript
plaintext → AES-256-CBC → base64 encode → send to server
```

**Decryption (Client-side)**
```javascript
receive from server → base64 decode → AES-256-CBC → plaintext
```

## Security Considerations

### Current Implementation
- ✅ Messages encrypted end-to-end
- ✅ Server cannot read message content
- ✅ AES-256 encryption (industry standard)
- ✅ Random IV for each message
- ✅ XSS protection via HTML escaping

### Limitations (Educational Project)
- ⚠️ Shared key must be distributed securely out-of-band
- ⚠️ No perfect forward secrecy
- ⚠️ No user authentication
- ⚠️ Keys stored in browser memory (not persistent)
- ⚠️ No message persistence (messages lost on refresh)

### Production Recommendations
For a production system, consider:
- Implement Diffie-Hellman or RSA key exchange
- Add user authentication (OAuth, JWT)
- Use TLS/SSL (HTTPS) for transport security
- Implement perfect forward secrecy
- Add message persistence (database)
- Implement key rotation
- Add rate limiting and abuse prevention

## Technical Details

### Socket.IO Events

**Client → Server**
- `join_chat`: Join a chat room
- `send_message`: Send encrypted message
- `typing`: Typing indicator status

**Server → Client**
- `connection_response`: Connection confirmation
- `encryption_key`: Room encryption key
- `join_confirmation`: Successfully joined room
- `user_joined`: New user joined notification
- `user_left`: User left notification
- `user_list_update`: Updated list of online users
- `receive_message`: Incoming encrypted message
- `user_typing`: Typing indicator from other users

### Encryption Algorithm
- **Algorithm**: AES (Advanced Encryption Standard)
- **Key Size**: 256 bits
- **Mode**: CBC (Cipher Block Chaining)
- **IV**: Random 16-byte initialization vector per message
- **Padding**: PKCS7

## Testing

### Test with Multiple Users

1. **Open multiple browser windows/tabs**
   - Window 1: User "Alice"
   - Window 2: User "Bob"

2. **Use the same room name and encryption key**

3. **Send messages between users**

4. **Verify encryption**
   - Open browser DevTools → Network tab
   - Watch WebSocket frames
   - Confirm messages are encrypted in transit

### Test Encryption

1. Join with correct key → Messages decrypt properly
2. Join with wrong key → Messages show "[Decryption Failed]"
3. Generate random key → Verify it's different each time

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Dependencies Not Installing
```bash
# Upgrade pip
pip install --upgrade pip

# Install dependencies one by one
pip install Flask
pip install flask-socketio
pip install pycryptodome
```

### Connection Issues
- Check firewall settings
- Ensure port 5000 is open
- Try accessing via `127.0.0.1:5000` instead of `localhost:5000`

## Future Enhancements

- [ ] Public/private key encryption (RSA)
- [ ] Diffie-Hellman key exchange
- [ ] File sharing support
- [ ] Message history persistence
- [ ] User authentication
- [ ] Private messaging (DMs)
- [ ] Message read receipts
- [ ] Emoji support
- [ ] Dark mode
- [ ] Mobile app version

## License

This is an educational project for learning socket programming and encryption concepts.

## Contributors

Built for Network Programming Final Project

---

**Note**: This is an educational implementation. For production use, consult security experts and follow industry best practices.
=======
# ChatApp
>>>>>>> 68ca38b998f6e2005d9aa283910d2a0fd386549a
