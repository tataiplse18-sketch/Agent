/**
 * AgentForge — WebSocket Service
 *
 * Real-time communication service using socket.io on port 3003.
 * Handles agent message broadcasts, task status updates, and
 * project status changes.
 *
 * Frontend connects using: io("/?XTransformPort=3003")
 *
 * Events:
 *   Client → Server:
 *     - project:join    { projectId }    — Subscribe to project updates
 *     - project:leave   { projectId }    — Unsubscribe from project updates
 *
 *   Server → Client:
 *     - agent:message   { projectId, agentType, content, metadata?, timestamp }
 *     - task:update     { projectId, taskId, status, output?, timestamp }
 *     - project:status  { projectId, status, timestamp }
 *
 *   HTTP POST → /broadcast (from orchestrator):
 *     Body: { event: string, data: Record<string, unknown> }
 *     This allows the server-side orchestrator to emit events via HTTP,
 *     which are then broadcast to all subscribed WebSocket clients.
 */

import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

// ============================================================
// HTTP Server (for orchestrator → WS bridge)
// ============================================================

const httpServer = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // POST /broadcast — Receive events from the orchestrator and fan out to WS clients
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const { event, data } = JSON.parse(body)

        if (!event || !data || !data.projectId) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing event or projectId' }))
          return
        }

        const room = `project:${data.projectId}`
        const payload = { ...data, timestamp: new Date().toISOString() }

        // Broadcast to all clients in the project room
        io.to(room).emit(event, payload)

        console.log(`📡 [Broadcast] ${event} → ${room}`)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, event, room }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      }
    })

    return
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', port: PORT, connectedClients }))
    return
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

// ============================================================
// Socket.io Server
// ============================================================

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// Track connected clients count
let connectedClients = 0

io.on('connection', (socket) => {
  connectedClients++
  console.log(`🔗 Client connected: ${socket.id} (Total: ${connectedClients})`)

  // ============================================================
  // Project Room Management
  // ============================================================

  /**
   * Join a project room to receive real-time updates for that project.
   * A client can watch multiple projects simultaneously.
   */
  socket.on('project:join', (data: { projectId: string }) => {
    const room = `project:${data.projectId}`
    socket.join(room)
    console.log(`👁️ Socket ${socket.id} joined ${room}`)

    // Confirm to the client
    socket.emit('project:joined', { projectId: data.projectId })
  })

  /**
   * Leave a project room to stop receiving updates.
   */
  socket.on('project:leave', (data: { projectId: string }) => {
    const room = `project:${data.projectId}`
    socket.leave(room)
    console.log(`🚪 Socket ${socket.id} left ${room}`)
  })

  // ============================================================
  // Agent Event Broadcasting (from client socket events)
  // ============================================================

  /**
   * Broadcast an agent message to all clients watching a project.
   * This is used when an agent sends or receives a message during the pipeline.
   */
  socket.on('agent:message', (data: {
    projectId: string
    agentType: string
    content: string
    metadata?: Record<string, unknown>
  }) => {
    const room = `project:${data.projectId}`
    console.log(`💬 [${data.agentType.toUpperCase()}] Message in ${room}`)
    io.to(room).emit('agent:message', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  /**
   * Broadcast a task status update to all clients watching a project.
   * Used when a task changes status (pending → running → completed/failed).
   */
  socket.on('task:update', (data: {
    projectId: string
    taskId: string
    status: string
    output?: string
  }) => {
    const room = `project:${data.projectId}`
    console.log(`📋 Task ${data.taskId} → ${data.status} in ${room}`)
    io.to(room).emit('task:update', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  /**
   * Broadcast a project status update to all clients watching a project.
   * Used when the overall project status changes.
   */
  socket.on('project:status', (data: {
    projectId: string
    status: string
  }) => {
    const room = `project:${data.projectId}`
    console.log(`📊 Project → ${data.status} in ${room}`)
    io.to(room).emit('project:status', {
      ...data,
      timestamp: new Date().toISOString(),
    })
  })

  // ============================================================
  // Disconnection
  // ============================================================

  socket.on('disconnect', (reason) => {
    connectedClients--
    console.log(`🔌 Client disconnected: ${socket.id} (Total: ${connectedClients}, Reason: ${reason})`)
  })
})

// ============================================================
// Start Server
// ============================================================

httpServer.listen(PORT, () => {
  console.log(`\n🚀 AgentForge WebSocket service running on port ${PORT}`)
  console.log(`📡 Socket.io ready for real-time agent communication`)
  console.log(`🔗 HTTP /broadcast endpoint for orchestrator → WS bridge`)
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`)
})
