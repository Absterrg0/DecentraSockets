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

// Middleware to parse JSON requests
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('WebSocket server is running and healthy!');
});

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

      // Send the message to the API to save it in the database
      const response = await fetch(`${process.env.API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const savedMessage = await response.json();

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
