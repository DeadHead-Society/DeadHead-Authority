'use strict';

const socket = io();
const joinView = document.querySelector('#joinView');
const chatView = document.querySelector('#chatView');
const handleInput = document.querySelector('#handle');
const joinButton = document.querySelector('#joinButton');
const joinError = document.querySelector('#joinError');
const users = document.querySelector('#users');
const messages = document.querySelector('#messages');
const form = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');

function addSystemMessage(text) {
  const row = document.createElement('div');
  row.className = 'system-message';
  row.textContent = `[SYSTEM] ${text}`;
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
}

function addChatMessage({ handle, message, time }) {
  const row = document.createElement('article');
  row.className = 'message';

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = `${handle} // ${new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const body = document.createElement('div');
  body.textContent = message;

  row.append(meta, body);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
}

function join() {
  joinError.textContent = '';
  socket.emit('join', handleInput.value, (result) => {
    if (!result?.ok) {
      joinError.textContent = result?.error || 'Unable to link to channel.';
      return;
    }
    joinView.classList.add('hidden');
    chatView.classList.remove('hidden');
    addSystemMessage(`Linked as ${result.handle}.`);
    messageInput.focus();
  });
}

joinButton.addEventListener('click', join);
handleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') join();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;
  socket.emit('chat-message', message);
  messageInput.value = '';
});

socket.on('chat-message', addChatMessage);
socket.on('system-message', addSystemMessage);
socket.on('user-list', (handles) => {
  users.replaceChildren(...handles.map((handle) => {
    const item = document.createElement('li');
    item.textContent = handle;
    return item;
  }));
});
