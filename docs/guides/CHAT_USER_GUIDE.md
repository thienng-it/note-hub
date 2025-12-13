# Chat Feature User Guide

## Overview

The Chat feature in NoteHub enables real-time communication between users. You can send instant messages, see when others are typing, and stay connected with your team.

## Getting Started

### Accessing Chat

1. **Desktop/Tablet**: Click the "Chat" link in the left sidebar (with the chat bubble icon 💬)
2. **Mobile**: Tap the "Chat" icon in the bottom navigation bar

### Starting a New Chat

1. Click the **"New Chat"** button at the top right
2. Search for a user by username or email
3. Click on the user you want to chat with
4. Start typing your message!

## Features

### Direct Messaging

- **One-on-One Conversations**: Chat privately with any NoteHub user
- **Automatic Chat Creation**: Chats are created automatically when you send your first message
- **Persistent History**: All your messages are saved and accessible anytime

### Real-Time Communication

- **Instant Delivery**: Messages appear instantly for both sender and receiver
- **Typing Indicators**: See when someone is typing a response
- **Online Status**: Green dot indicates when users are online
- **Read Receipts**: Know when your messages have been read

### Message Management

- **Unread Counts**: See how many unread messages you have in each chat
- **Auto-Read**: Messages are automatically marked as read when you open a chat
- **Message History**: Load older messages by scrolling up
- **Timestamps**: See when each message was sent

## Using the Chat Interface

### Chat List (Left Panel)

The chat list shows all your conversations with:
- **Contact Name**: The person you're chatting with
- **Last Message**: Preview of the most recent message
- **Timestamp**: When the last message was sent
- **Unread Badge**: Number of unread messages (if any)
- **Online Indicator**: Green dot if the user is online

**Tip**: Click on any chat to open the conversation.

### Chat Window (Right Panel)

When you select a chat, you'll see:
- **Header**: Shows who you're chatting with and typing status
- **Messages**: All your conversation history
- **Message Input**: Type and send new messages

### Sending Messages

1. Type your message in the input box at the bottom
2. Press **Enter** or click the **Send** button
3. Your message will appear instantly for both you and the recipient

**Keyboard Shortcuts**:
- `Enter`: Send message
- `Shift + Enter`: New line (not yet implemented, currently just Enter sends)

### Message Display

- **Your Messages**: Appear on the right in blue
- **Their Messages**: Appear on the left in gray/white
- **Sender Name**: Shown for messages from others
- **Timestamp**: Shown below each message

## Connection Status

The chat uses WebSocket technology for real-time communication:

- **Connected**: Green indicator or no warning
- **Reconnecting**: Yellow warning message appears
- **Disconnected**: Messages will be sent when reconnected

**Note**: If you lose connection, the app will automatically try to reconnect.

## Privacy & Security

### What's Protected

- ✅ **JWT Authentication**: All chat connections require valid authentication
- ✅ **Access Control**: You can only access chats you're a participant in
- ✅ **Encrypted Transport**: All communication uses HTTPS/WSS
- ✅ **Message Privacy**: Only chat participants can see messages

### What's NOT Encrypted

- ❌ Messages are stored in plain text in the database
- ❌ Server administrators can access message content
- ❌ End-to-end encryption is not currently implemented

**Recommendation**: Don't share sensitive information (passwords, API keys, etc.) via chat.

## Tips & Best Practices

### For Better Experience

1. **Keep Browsers Updated**: Modern browsers work best with WebSocket
2. **Stable Connection**: Use a stable internet connection for best real-time performance
3. **Close Unused Chats**: Click away from a chat to free up resources
4. **Regular Refresh**: If experiencing issues, refresh the page

### Etiquette

1. **Be Respectful**: Treat others with respect and professionalism
2. **Response Time**: Chat is instant but don't expect immediate replies
3. **Message Length**: Keep messages concise and clear
4. **Working Hours**: Respect others' time and working hours

## Troubleshooting

### Messages Not Sending

**Problem**: Messages aren't being delivered

**Solutions**:
1. Check your internet connection
2. Look for connection status warnings
3. Refresh the page
4. Log out and log back in
5. Check browser console for errors (F12)

### Can't See Messages

**Problem**: Messages aren't appearing

**Solutions**:
1. Scroll up to load older messages
2. Click on the chat to select it
3. Refresh the page
4. Check if messages appear after a few seconds

### Connection Issues

**Problem**: "Disconnected" or "Reconnecting" warnings

**Solutions**:
1. Check your internet connection
2. Wait for automatic reconnection (15-30 seconds)
3. Refresh the page if it doesn't reconnect
4. **Development Setup**: If running in development mode, ensure `VITE_API_URL=http://localhost:5000` is set in `frontend/.env` file
5. Contact system administrator if problem persists

**Development Note**: The chat feature requires WebSocket connections. In development, the frontend and backend run on different ports. You must set `VITE_API_URL` in your `.env` file to point to the backend server (typically `http://localhost:5000`). Without this, Socket.io will try to connect to the frontend dev server instead of the backend.

### User Not Found

**Problem**: Can't find a user to chat with

**Solutions**:
1. Check spelling of username or email
2. Ask the user for their exact username
3. Verify they have a NoteHub account
4. Contact administrator if user should exist

## Mobile Experience

### Mobile-Specific Features

- **Bottom Navigation**: Chat icon in mobile navigation
- **Full-Screen Chat**: Chat takes up entire screen on mobile
- **Touch-Optimized**: Larger tap targets for easier use
- **Mobile Keyboard**: Optimized input for mobile keyboards

### Mobile Tips

1. **Landscape Mode**: Rotate for wider message input
2. **Notification**: Leave app open for real-time updates
3. **Battery**: WebSocket connection may use more battery
4. **Data Usage**: Real-time sync uses data continuously

## Keyboard Shortcuts

Currently, the chat feature has minimal keyboard shortcuts:

- **Enter**: Send message
- **Tab**: Navigate between UI elements
- **Escape**: Close new chat modal

**Coming Soon**:
- `Shift + Enter`: New line in message
- `Ctrl/Cmd + K`: Quick search users
- `↑/↓`: Navigate between chats

## Known Limitations

### Current Limitations

1. **Direct Messages Only**: Group chats not yet supported
2. **Text Only**: Cannot send files or images via chat
3. **No Editing**: Sent messages cannot be edited
4. **No Deletion**: Messages cannot be deleted
5. **Limited Search**: Cannot search message content yet
6. **No Notifications**: Browser notifications not implemented

### Future Enhancements

The following features are planned for future releases:

- 🔔 Desktop notifications
- 👥 Group chat support
- 📎 File and image sharing
- ✏️ Edit sent messages
- 🗑️ Delete messages
- 🔍 Message search
- 📌 Pin important chats
- 🎨 Message formatting (bold, italic, etc.)
- 😊 Emoji picker
- 🎵 Sound notifications

## Technical Details

### Browser Requirements

**Minimum Requirements**:
- Modern browser with WebSocket support
- JavaScript enabled
- Cookies enabled

**Recommended Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance

- **Message Load**: Up to 50 messages per page
- **Connection**: Reconnects automatically if dropped
- **Memory**: Minimal impact on browser memory
- **CPU**: Negligible CPU usage when idle

## Frequently Asked Questions

### Q: Can I chat with multiple users at once?
**A**: Currently, only one-on-one (direct) chats are supported. Group chats are planned for a future release.

### Q: Are my messages private?
**A**: Messages are only visible to chat participants, but server administrators can access them. Don't share sensitive information.

### Q: Can I delete sent messages?
**A**: Not yet. Message deletion is planned for a future release.

### Q: Do I get notifications for new messages?
**A**: Browser notifications are not yet implemented. You'll see unread counts in the chat list.

### Q: Can I send files or images?
**A**: Not yet. File sharing is planned for a future release.

### Q: What happens if I lose internet connection?
**A**: Messages won't be delivered until you reconnect. The app will automatically try to reconnect.

### Q: Can I search my message history?
**A**: Message search is not yet available but is planned for a future release.

### Q: Is there a chat message limit?
**A**: There's no limit to how many messages you can send or store.

## Getting Help

If you experience issues with the chat feature:

1. **Check this guide** for troubleshooting steps
2. **Refresh the page** - solves most connection issues
3. **Check browser console** (F12) for error messages
4. **Contact support** with:
   - Description of the problem
   - Browser and version
   - Steps to reproduce
   - Any error messages

## Feedback

We're constantly improving the chat feature! Please share your feedback:

- 💡 Feature requests
- 🐛 Bug reports
- 💬 User experience feedback
- ⭐ What you love about it

Your input helps us make NoteHub better for everyone!
