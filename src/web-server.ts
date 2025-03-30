import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { MCPLLMBridge } from './bridge';
import { BridgeConfig } from './types';
import bodyParser from 'body-parser';
import { logger } from './logger';

export class WebServer {
  private app: express.Application;
  private server: http.Server;
  private io: Server;
  private bridge: MCPLLMBridge;
  private port: number;

  constructor(bridge: MCPLLMBridge, port: number = 3000) {
    this.bridge = bridge;
    this.port = port;
    this.app = express();
    
    // Middleware
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
    
    // Create HTTP server
    this.server = http.createServer(this.app);
    
    // Initialize Socket.io
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  private setupRoutes() {
    // API endpoint to send a message to the LLM
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message } = req.body;
        if (!message) {
          return res.status(400).json({ error: 'No message provided' });
        }
        
        logger.info(`Web API - Processing message: ${message}`);
        const response = await this.bridge.processMessage(message);
        return res.json({ response });
      } catch (error: any) {
        logger.error(`Web API error: ${error?.message || String(error)}`);
        return res.status(500).json({ error: error?.message || 'An error occurred' });
      }
    });
    
    // API endpoint to list available tools
    this.app.get('/api/tools', async (req, res) => {
      try {
        const tools = this.bridge.tools.map(tool => ({
          name: tool.function.name,
          description: tool.function.description
        }));
        return res.json({ tools });
      } catch (error: any) {
        logger.error(`Web API error listing tools: ${error?.message || String(error)}`);
        return res.status(500).json({ error: error?.message || 'An error occurred' });
      }
    });
    
    // Main HTML page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`New client connected: ${socket.id}`);
      
      socket.on('chat message', async (message) => {
        try {
          logger.info(`Socket - Processing message: ${message}`);
          const response = await this.bridge.processMessage(message);
          socket.emit('chat response', response);
        } catch (error: any) {
          logger.error(`Socket error: ${error?.message || String(error)}`);
          socket.emit('error', { error: error?.message || 'An error occurred' });
        }
      });
      
      socket.on('list tools', async () => {
        try {
          const tools = this.bridge.tools.map(tool => ({
            name: tool.function.name,
            description: tool.function.description
          }));
          socket.emit('tools list', { tools });
        } catch (error: any) {
          logger.error(`Socket error listing tools: ${error?.message || String(error)}`);
          socket.emit('error', { error: error?.message || 'An error occurred' });
        }
      });
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public start() {
    this.server.listen(this.port, () => {
      logger.info(`Web server listening on port ${this.port}`);
      logger.info(`Open your browser at http://localhost:${this.port}`);
    });
  }

  public stop() {
    this.server.close();
  }
}
