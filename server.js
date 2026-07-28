'use strict';

const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const app = express();

// The application does not add request logging and does not save IP addresses.
// Your operating system, reverse proxy, CDN, or hosting company may still keep access logs.
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  serveClient: true,
  maxHttpBufferSize: 16_000,
  perMessageDeflate: false
});

const users = new Map();

function cleanHandle(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 24);
}

function cleanMessage(value) {
  return String(value ?? '').trim().slice(0, 500);
}

function userList() {
  return [...users.values()].sort((a, b) => a.localeCompare(b));
}

io.on('connection', (socket) => {
  socket.on('join', (requestedHandle, reply) => {
    const handle = cleanHandle(requestedHandle);
    const taken = userList().some((name) => name.toLowerCase() === handle.toLowerCase());

    if (handle.length < 2) {
      return reply?.({ ok: false, error: 'Handle must contain at least 2 valid characters.' });
    }
    if (taken) {
      return reply?.({ ok: false, error: 'That handle is already active.' });
    }

    users.set(socket.id, handle);
    socket.data.handle = handle;
    reply?.({ ok: true, handle });

    socket.broadcast.emit('system-message', `${handle} linked to the channel.`);
    io.emit('user-list', userList());
  });

  socket.on('chat-message', (rawMessage) => {
    const handle = socket.data.handle;
    const message = cleanMessage(rawMessage);
    if (!handle || !message) return;

    io.emit('chat-message', {
      handle,
      message,
      time: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const handle = users.get(socket.id);
    users.delete(socket.id);
    if (handle) socket.broadcast.emit('system-message', `${handle} dropped from the channel.`);
    io.emit('user-list', userList());
  });
});

server.listen(PORT, () => {
  console.log(`Handle chat available at http://localhost:${PORT}`);
});
