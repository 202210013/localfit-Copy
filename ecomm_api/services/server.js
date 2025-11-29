// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // For development only. Use your Angular app's URL in production.
    methods: ["GET", "POST"]
  }
});

let messages = []; // In production, use a database!

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send all messages to the new user
  socket.emit('all-messages', messages);

  // Listen for new messages
  socket.on('send-message', (msg) => {
    messages.push(msg);
    // Broadcast to all clients (or use rooms for private messaging)
    io.emit('receive-message', msg);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3000, () => {
  console.log('Socket.IO server running on port 3000');
});