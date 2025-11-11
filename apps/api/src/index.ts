/**
 * FreeTimeChat API Server
 *
 * Main entry point for the Express API server
 */

import dotenv from 'dotenv';
import { initializeLLMService } from './integrations/llm';
import { app } from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize services and start server
 */
async function startServer() {
  try {
    // Initialize LLM service
    await initializeLLMService();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 API server running on port ${PORT}`);
      console.log(`📦 Environment: ${NODE_ENV}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
