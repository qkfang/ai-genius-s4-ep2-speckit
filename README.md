# AI Genius Season 4 Episode 2 — Spec-Kit with GitHub Copilot

> **Spec-Driven Development with GitHub Copilot, then deploy to Azure using Bicep and GitHub Actions.**

---

## 📋 Overview

This repository demonstrates how to use [Spec-Kit](https://github.com/github/spec-kit) with
**GitHub Copilot** to design the AI Genius application spec-first, then deploy it to Azure
using **Bicep** (Infrastructure as Code) and **GitHub Actions** CI/CD.

---

## 📖 Full Guide

See [`docs/guide.md`](docs/guide.md) for the complete step-by-step walkthrough,
including all `/speckit.*` command examples and the full Azure deployment setup.

---

## 🗂️ Project Structure

```
ai-genius-s4-ep2-speckit/
│
├── bicep/
│   ├── main.bicep                  # Orchestrates all Azure modules
│   └── modules/
│       ├── staticwebapp.bicep      # Azure Static Web App (React frontend)
│       └── webapp.bicep            # Azure App Service + Plan (Node.js API)
│
├── src/
│   ├── aigenius-api/               # Node.js Express API
│   └── aigenius-web/               # React + Vite frontend
│
└── .github/
    └── workflows/
        └── deploy.yml              # Provision Bicep + deploy to Azure on main
```

---

## ⚡ Quick Start

Use spec-kit slash commands in GitHub Copilot Chat.
Open Copilot Chat and run the commands in order:

```
/speckit.constitution  <your project principles>
/speckit.specify       <what you want to build>
/speckit.clarify       <resolve ambiguities>
/speckit.checklist
/speckit.plan          <your tech stack>
/speckit.tasks
/speckit.analyze
/speckit.implement
```

---

## 🔧 Local Development

```bash
# Run the API locally
cd src/aigenius-api
npm ci && npm start        # http://localhost:3000

# Run the React frontend locally
cd src/aigenius-web
npm ci && npm run dev      # http://localhost:5173
```
