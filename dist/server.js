"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load environment variables
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
// Middleware to parse JSON requests
app.use(express_1.default.json());
// Health check endpoint
app.get('/', (req, res) => {
    res.send('WebSocket server is running and healthy!');
});
wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
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
                if (client !== ws && client.readyState === ws_1.default.OPEN) {
                    client.send(JSON.stringify(savedMessage));
                }
            });
        }
        catch (error) {
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
