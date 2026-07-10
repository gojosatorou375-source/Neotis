# Skill: Backend Development (Node.js, Postgres & APIs)

> This file represents project-level coding preferences for backend services, database operations, and secure API endpoints. Apply these rules to all backend work.

## Technology Stack
- **Runtime:** Node.js (LTS Version)
- **Framework:** Express.js / NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL (with Prisma ORM or Kysely query builder)
- **Caching:** Redis

## API Design & Standards
- **REST Conventions:** Use standard HTTP verbs (`GET` for retrieval, `POST` for creation, `PUT` / `PATCH` for updates, `DELETE` for removal).
- **Responses:** Always return JSON payloads wrapping success metadata or structured error formats:
  ```json
  {
    "success": false,
    "error": {
      "code": "BAD_REQUEST",
      "message": "Validation failed.",
      "details": []
    }
  }
  ```
- **Versioning:** Version all endpoints using URI prefixes (e.g. `/api/v1/...`).

## Database & Query Safety
- **Parameterization:** Never concatenate variables into SQL strings. Always use parameterized queries or ORM helpers to prevent SQL Injection.
- **Migrations:** Change database schemas strictly via versioned migration scripts. Do not perform manual modifications in production.
- **Connections:** Re-use database connection pools; close idling connections and handle reconnection strategies robustly.

## Security & Verification
- **Input Validation:** Validate all incoming payloads against schemas (e.g. using `Zod` or `Joi`) before executing business logic.
- **Authentication:** Protect endpoints using JWT tokens. Extract claims securely and verify token expiration.
- **Secrets Management:** Load API keys, passwords, and tokens strictly from environment variables (`process.env`). Never commit credentials to version control.

---

*This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant.*
