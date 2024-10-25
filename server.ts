import WebSocket from 'ws';
import express from 'express';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

interface MessageData {
  content: string;
  senderId: number;
  receiverId: number;
  projectId: number;
}

wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  ws.on('message', async (message: string) => {
    try {
      const data: MessageData = JSON.parse(message);
    
      // Save the message to the database
      const savedMessage = await prisma.message.create({
        data: {
          content: data.content,
          senderId: data.senderId,
          receiverId: data.receiverId,
          projectId: data.projectId,
        },
      });

      // Broadcast the message to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(savedMessage));
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    prisma.$disconnect();
  });
});