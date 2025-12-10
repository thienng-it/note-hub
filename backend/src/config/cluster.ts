/**
 * Cluster Configuration for Multi-Core Support
 *
 * Enables horizontal scaling by utilizing all available CPU cores.
 * Each worker process runs an independent instance of the application.
 */

import cluster from 'node:cluster';
import os from 'node:os';
import process from 'node:process';

/**
 * Start the application in cluster mode
 * @param startApp - Function to start the application
 */
export function startCluster(startApp: () => Promise<void> | void): void {
  const numCPUs = os.cpus().length;
  const maxWorkers = parseInt(process.env.MAX_WORKERS || String(numCPUs), 10);
  const workersToFork = Math.min(maxWorkers, numCPUs);

  if (cluster.isPrimary) {
    console.log(`🚀 Master process ${process.pid} is running`);
    console.log(`🔧 Forking ${workersToFork} worker processes (${numCPUs} CPUs available)`);

    // Fork workers
    for (let i = 0; i < workersToFork; i++) {
      cluster.fork();
    }

    // Handle worker events
    cluster.on('online', (worker) => {
      console.log(`✅ Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
      console.log(
        `❌ Worker ${worker.process.pid} died (${signal || code}). Restarting...`,
      );
      cluster.fork();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 SIGTERM received. Shutting down gracefully...');
      for (const id in cluster.workers) {
        cluster.workers[id]?.kill();
      }
    });

    process.on('SIGINT', () => {
      console.log('📴 SIGINT received. Shutting down gracefully...');
      for (const id in cluster.workers) {
        cluster.workers[id]?.kill();
      }
      process.exit(0);
    });
  } else {
    // Worker process
    console.log(`👷 Worker process ${process.pid} started`);
    
    // Start the application
    Promise.resolve(startApp()).catch((error) => {
      console.error(`❌ Worker ${process.pid} failed to start:`, error);
      process.exit(1);
    });

    // Handle worker shutdown
    process.on('SIGTERM', () => {
      console.log(`📴 Worker ${process.pid} received SIGTERM. Shutting down...`);
      process.exit(0);
    });
  }
}

/**
 * Check if clustering is enabled
 */
export function isClusteringEnabled(): boolean {
  return process.env.ENABLE_CLUSTERING === 'true';
}

/**
 * Get optimal number of workers based on CPU cores
 */
export function getOptimalWorkers(): number {
  const numCPUs = os.cpus().length;
  const maxWorkers = parseInt(process.env.MAX_WORKERS || String(numCPUs), 10);
  return Math.min(maxWorkers, numCPUs);
}

export default {
  startCluster,
  isClusteringEnabled,
  getOptimalWorkers,
};
