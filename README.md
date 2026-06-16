<div align="center">

# 🤖 AgentForge

### Your AI Software Engineering Team

**Describe what you want built — AI agents plan, code, test, and deliver it.**

[![Open Source](https://img.shields.io/badge/Open_Source-✓-brightgreen?style=flat-square)](https://github.com/tataiplse18-sketch/Agent)
[![Free Forever](https://img.shields.io/badge/Free_Forever-✓-blue?style=flat-square)](https://github.com/tataiplse18-sketch/Agent)
[![GLM5.1 Powered](https://img.shields.io/badge/GLM5.1-Powered-9b59b6?style=flat-square)](https://github.com/tataiplse18-sketch/Agent)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?style=flat-square)](https://github.com/tataiplse18-sketch/Agent)

[🚀 Quick Start](#-quick-start) · [📖 How It Works](#-how-it-works) · [🏗️ Architecture](#-project-architecture) · [🤝 Contributing](#-contributing)

</div>

---

## 🧠 What is AgentForge?

AgentForge is an **autonomous multi-agent AI platform** that turns your software ideas into production-ready code. Simply describe what you want built, and a team of specialized AI agents — Orchestrator, Planner, Coder, QA, and Git — automatically breaks down your goal, creates an implementation plan, writes code, reviews it for quality, and packages it for delivery. It's like hiring an entire engineering team that works 24/7, never sleeps, and delivers in minutes instead of months.

No sign-up, no login, no credit card. Just open the app and start building.

---

## 🔄 How It Works

```
🎯 Your Goal  →  🧠 Orchestrator  →  📋 Planner  →  💻 Coder  →  🔍 QA  →  🌿 Git  →  ✅ Delivered
```

1. **You describe** the software you want built
2. **Orchestrator** breaks your goal into specialized tasks
3. **Planner** creates detailed implementation blueprints
4. **Coder** generates production-quality code for each task
5. **QA** reviews everything — finds bugs, suggests improvements
6. **Git** packages it all — commits, PRs, deployment configs
7. **You download** the complete, reviewed, production-ready code

All of this happens **in real-time** — you watch every agent think, plan, and code via live WebSocket updates.

---

## 👥 The Agent Team

| Agent | Role | What It Does |
|:-----:|:----:|:-------------|
| 🧠 **Orchestrator** | Lead Agent | Analyzes your goal, breaks it into tasks, assigns to specialist agents, manages the pipeline |
| 📋 **Planner** | Architect | Creates detailed step-by-step implementation plans with file structures and dependencies |
| 💻 **Coder** | Developer | Generates production-quality code with proper error handling, types, and best practices |
| 🔍 **QA** | Reviewer | Reviews all code, finds bugs, security issues, suggests improvements, writes test cases |
| 🌿 **Git** | DevOps | Creates branch strategy, commit messages, PR descriptions, and deployment configurations |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|:----------:|:--------|
| ![Next.js](https://img.shields.io/badge/Next.js_16-000?style=flat-square&logo=next.js) | Full-stack React framework with App Router |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript) | End-to-end type safety |
| ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma) + SQLite | Database ORM with zero-config SQLite |
| ![GLM5.1](https://img.shields.io/badge/GLM5.1-9b59b6?style=flat-square) | AI model via z-ai-web-dev-sdk |
| ![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io) | Real-time agent updates |
| ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss) + shadcn/ui | Beautiful dark UI components |
| ![Zustand](https://img.shields.io/badge/Zustand-FF6B6B?style=flat-square) | Lightweight state management |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- **npm** or **bun** package manager

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/tataiplse18-sketch/Agent.git
cd Agent

# 2. Install dependencies
npm install

# 3. Setup database
npx prisma db push

# 4. Copy environment config
cp .env.example .env

# 5. Install and start WebSocket service
cd mini-services/ws-service && npm install && cd ../..
npm run ws:start &

# 6. Start the app
npm run dev
```

### Docker (Alternative)

```bash
# One command to rule them all
docker compose up --build
```

Open **http://localhost:3000** and start building! 🎉

---

## 📱 Usage

1. **Open** http://localhost:3000 in your browser
2. **Describe** your project — name, description, goal, tech stack
3. **Click** "Start Building" — the AI team goes to work
4. **Watch** agents plan, code, and review in real-time
5. **Browse** generated code in the built-in code viewer
6. **Download** individual files or the complete project

That's it. No sign-up, no configuration, no limits.

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Project  │  │  Agent   │  │   Task   │  │  Code   │ │
│  │   Form    │  │   Log    │  │  Timeline│  │ Viewer  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│       └──────────────┴──────┬───────┴──────────────┘      │
│                             │ Zustand Store               │
│                    ┌────────┴────────┐                    │
│                    │  Socket.io Client│◄── WS :3003       │
│                    └────────┬────────┘                    │
└─────────────────────────────┼─────────────────────────────┘
                              │
┌─────────────────────────────┼─────────────────────────────┐
│                    Next.js Server :3000                    │
│                             │                              │
│  ┌──────────┐  ┌──────────┐  │  ┌──────────┐             │
│  │  POST    │  │  GET     │  │  │  POST    │             │
│  │ /projects│  │/projects │  │  │  /start  │             │
│  └────┬─────┘  └────┬─────┘  │  └────┬─────┘             │
│       │              │        │       │                    │
│       └──────────────┴────────┴───────┘                    │
│                             │                              │
│                    ┌────────┴────────┐                     │
│                    │    Prisma ORM   │                     │
│                    │   (SQLite DB)   │                     │
│                    └────────┬────────┘                     │
└─────────────────────────────┼──────────────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────┐
│                   Agent Pipeline                            │
│                                                             │
│   🧠 Orchestrator → 📋 Planner → 💻 Coder → 🔍 QA → 🌿 Git│
│        │                                                  │
│        └─────► POST /broadcast (WS Service :3003) ────────►│
│                          │                                  │
│               ┌──────────┴──────────┐                      │
│               │   z-ai-web-dev-sdk  │                      │
│               │   (GLM5.1 API)      │                      │
│               └─────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/api/projects` | Create a new project with name, description, goal |
| `GET` | `/api/projects` | List all projects with task/message/file counts |
| `GET` | `/api/projects/[id]` | Get full project details with tasks, messages, and code |
| `POST` | `/api/projects/[id]/start` | Start the AI agent pipeline (runs in background) |

---

## 📂 Project Structure

```
Agent/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/projects/       # REST API routes
│   │   ├── page.tsx            # Main dashboard (single-page app)
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles (dark theme)
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── ProjectForm.tsx     # Project creation form
│   │   ├── ProjectCard.tsx     # Project card for grid view
│   │   ├── AgentLog.tsx        # Terminal-style agent log
│   │   ├── TaskList.tsx        # Pipeline timeline view
│   │   └── CodeViewer.tsx      # VS Code-like code browser
│   ├── lib/                    # Core libraries
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── glm-client.ts       # GLM5.1 API client (with retry)
│   │   ├── agent-prompts.ts    # 5 agent system prompts
│   │   ├── agent-orchestrator.ts # Pipeline brain
│   │   ├── broadcast.ts        # WebSocket broadcast helper
│   │   ├── useWebSocket.ts     # React hook (WS + reconnect)
│   │   ├── store.ts            # Zustand state store
│   │   ├── utils.ts            # Utility functions
│   │   └── types/index.ts      # TypeScript type definitions
│   └── types/
├── mini-services/
│   └── ws-service/             # Socket.io server (port 3003)
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.example                # Environment template
├── Dockerfile                  # Multi-stage production build
├── docker-compose.yml          # App + WS service
└── package.json                # Dependencies & scripts
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|:---------|:--------|:------------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path |
| `WS_SERVICE_URL` | `http://localhost:3003` | WebSocket service URL |
| `WS_SERVICE_PORT` | `3003` | WebSocket service port |
| `NEXT_PUBLIC_APP_NAME` | `AgentForge` | Application display name |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Application URL |

> **Note:** GLM5.1 API access is handled automatically by `z-ai-web-dev-sdk` — no API key configuration needed.

---

## 🐳 Docker

### Build & Run

```bash
# Build and start all services
docker compose up --build

# Run in background
docker compose up -d --build

# Stop all services
docker compose down

# View logs
docker compose logs -f
```

The docker-compose setup includes:
- **app** — Next.js application on port 3000
- **ws-service** — Socket.io service on port 3003
- **app-data** — Persistent volume for SQLite database

---

## 🤝 Contributing

We love contributions! AgentForge is open source and community-driven.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m "Add my feature"`
4. **Push** to your fork: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Guidelines

- Follow the existing code style (TypeScript strict mode)
- Add comments for complex logic
- Test your changes before submitting
- Keep PRs focused — one feature per PR
- Be respectful and constructive in discussions

### Ideas for Contributions

- 🎨 New UI themes or layout options
- 🤖 Additional agent types (Designer, DevOps, Security)
- 📊 Analytics dashboard for agent performance
- 🔌 Plugin system for custom agents
- 🌍 Internationalization (i18n)
- 📱 Mobile-responsive improvements

---

## 📄 License

This project is licensed under the **MIT License** — you're free to use, modify, and distribute it.

```
MIT License

Copyright (c) 2025 AgentForge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **[GLM5.1](https://github.com/zai)** — The powerful AI model that powers our agents
- **[z-ai-web-dev-sdk](https://github.com/zai)** — Seamless GLM5.1 API integration
- **[Next.js](https://nextjs.org)** — The React framework for the web
- **[shadcn/ui](https://ui.shadcn.com)** — Beautiful, accessible UI components
- **[Prisma](https://prisma.io)** — Next-generation ORM for TypeScript
- **[Socket.io](https://socket.io)** — Real-time bidirectional communication
- **[Zustand](https://github.com/pmndrs/zustand)** — Bear necessities for state management

---

<div align="center">

**Built with ❤️ by the open-source community**

[⬆ Back to Top](#-agentforge)

</div>
