from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import secrets
import base64
import os
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Store active users and their rooms
active_users = {}
chat_rooms = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('connection_response', {'status': 'connected', 'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    # Remove user from active users
    if request.sid in active_users:
        username = active_users[request.sid]['username']
        room = active_users[request.sid]['room']
        del active_users[request.sid]
        
        # Notify others in the room
        emit('user_left', {
            'username': username,
            'timestamp': datetime.now().strftime('%H:%M:%S')
        }, room=room)
        
        # Update user list
        room_users = [active_users[sid]['username'] for sid in active_users if active_users[sid]['room'] == room]
        emit('user_list_update', {'users': room_users}, room=room)

@socketio.on('join_chat')
def handle_join(data):
    username = data.get('username')
    room = data.get('room', 'CIT221')
    encryption_key = data.get('encryption_key')
    
    # Store user info
    active_users[request.sid] = {
        'username': username,
        'room': room,
        'encryption_key': encryption_key,
        'status': 'active'
    }
    
    # Join the room
    join_room(room)
    
    # Initialize room if it doesn't exist
    if room not in chat_rooms:
        chat_rooms[room] = {
            'encryption_key': encryption_key,
            'users': []
        }
    
    # Send encryption key to the new user (in a real app, use proper key exchange)
    emit('encryption_key', {
        'key': chat_rooms[room]['encryption_key']
    })
    
    # Notify others in the room
    emit('user_joined', {
        'username': username,
        'timestamp': datetime.now().strftime('%H:%M:%S')
    }, room=room, include_self=False)
    
    # Send user list to everyone in the room
    room_users = [{'username': active_users[sid]['username'], 'status': active_users[sid].get('status', 'active')} 
                  for sid in active_users if active_users[sid]['room'] == room]
    emit('user_list_update', {'users': room_users}, room=room)
    
    # Send join confirmation
    emit('join_confirmation', {
        'room': room,
        'username': username
    })

@socketio.on('send_message')
def handle_message(data):
    if request.sid not in active_users:
        return
    
    username = active_users[request.sid]['username']
    room = active_users[request.sid]['room']
    encrypted_message = data.get('encrypted_message')
    
    # Broadcast encrypted message to all users in the room
    emit('receive_message', {
        'username': username,
        'encrypted_message': encrypted_message,
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'sender_id': request.sid
    }, room=room)

@socketio.on('typing')
def handle_typing(data):
    if request.sid not in active_users:
        return
    
    username = active_users[request.sid]['username']
    room = active_users[request.sid]['room']
    is_typing = data.get('is_typing', False)
    
    # Broadcast typing status to others in the room
    emit('user_typing', {
        'username': username,
        'is_typing': is_typing
    }, room=room, include_self=False)

@socketio.on('status_change')
def handle_status_change(data):
    if request.sid not in active_users:
        return
    
    status = data.get('status', 'active')
    active_users[request.sid]['status'] = status
    
    username = active_users[request.sid]['username']
    room = active_users[request.sid]['room']
    
    # Send updated user list to everyone in the room
    room_users = [{'username': active_users[sid]['username'], 'status': active_users[sid].get('status', 'active')} 
                  for sid in active_users if active_users[sid]['room'] == room]
    emit('user_list_update', {'users': room_users}, room=room)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    socketio.run(app, debug=False, host='0.0.0.0', port=port)
