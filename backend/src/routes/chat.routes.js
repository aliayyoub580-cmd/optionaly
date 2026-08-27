const express = require('express');
const messagesRouter = express.Router();
const roomsRouter = express.Router();
const { getMessages, sendMessage, getRooms, uploadAttachment, chatUpload } = require('../controllers/chatController');

messagesRouter.get('/', getMessages);
messagesRouter.post('/upload', chatUpload.single('file'), uploadAttachment);
messagesRouter.post('/', chatUpload.single('file'), sendMessage);

roomsRouter.get('/', getRooms);

module.exports = { messages: messagesRouter, rooms: roomsRouter };
