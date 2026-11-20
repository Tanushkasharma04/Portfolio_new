# Portfolio_new

## Tanushka's Portfolio (Node.js + Express + Docker)

A personal portfolio served by a Node.js and Express backend. The projects shown on the page are loaded from a REST API, and visitors can send me a message through a contact form that is validated and stored by the server. The app is packaged with Docker so it runs the same way on any machine or host.

**Live site:** Not deployed yet.

## Features

- Express server that serves the portfolio website
- REST API for projects (`GET /api/projects`)
- Contact form API with validation, a spam trap and rate limiting (`POST /api/contact`)
- Health check endpoint (`GET /api/health`)
- Dockerfile for easy deployment

## Tech stack

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3 (Flexbox, Grid), vanilla JavaScript
- **DevOps:** Docker, Render deployment pending

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Returns server status |
| GET | `/api/projects` | Returns all projects |
| GET | `/api/projects/:id` | Returns one project, for example `codetrack` |
| POST | `/api/contact` | Saves a message. Body: `{ "name", "email", "message" }` |
| GET | `/api/messages` | Returns saved messages. Needs the `x-admin-key` header and an `ADMIN_KEY` environment variable |

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

## Run with Docker

```bash
docker build -t portfolio .
docker run -p 3000:3000 -e ADMIN_KEY=choose-a-secret portfolio
```

Open http://localhost:3000

## Deploy on Render

This repository includes a Render Blueprint in `render.yaml`.

1. Push this project to a GitHub repository.
2. In Render, choose **New > Blueprint** and connect the repository.
3. Review the service settings and create the service. Render will build the Docker image and provide a public `onrender.com` URL.
4. After the first successful deploy, replace the **Live site** value above with that URL.

The Blueprint uses Render's Free plan. Free web services can spin down when idle. Contact-form messages are written to local disk, which is ephemeral on Render; configure durable storage before relying on those messages.

## Environment variables

| Name | Purpose | Default |
|---|---|---|
| `PORT` | Port the server listens on | `3000` |
| `ADMIN_KEY` | Secret that unlocks `GET /api/messages`. If not set, that route is disabled | none |
| `DATA_DIR` | Folder where messages are saved | `./data` |

## Project structure

```
portfolio-node/
  server.js         Express server and API routes
  projects.json     Project data returned by the API
  public/           Frontend (index.html)
  Dockerfile
  package.json
```

## Contact

- Email: sharmatanushka57@gmail.com
- LinkedIn: [Tanushka Sharma](https://www.linkedin.com/in/tanushka-sharma-382844306)
- GitHub: [@Tanushkasharma04](https://github.com/Tanushkasharma04)
