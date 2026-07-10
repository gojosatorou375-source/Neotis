# Skill: DevOps & Infrastructure (Docker, CI/CD & AWS)

> This file represents project-level deployment rules, container setups, and CI/CD automation instructions. Apply these guidelines to operational tasks.

## Containerization (Docker)
- **Multi-Stage Builds:** Write Dockerfiles using multi-stage builds to keep production images lightweight (e.g. compile assets in a builder stage, copy only binaries/node_modules to the final runner stage).
- **Non-Root User:** Never run container processes as root. Explicitly create and switch to a service user inside the Dockerfile:
  ```dockerfile
  RUN useradd -u 1001 appuser
  USER appuser
  ```
- **Caching Layer:** Place dependency installations (`package.json`, `npm install` or `pip install`) before copying application code to leverage Docker cache layers.

## CI/CD Pipeline Standards
- **Automated Verification:** Every pull request must trigger linter checks, type audits, and unit tests.
- **Artifact Protection:** Build docker images only on successful branch verification. Tag images with the commit SHA and push them to secure repositories.
- **Failures:** Set up automatic notifications (via Slack, Discord, or email) to alert developers of pipeline crashes.

## Infrastructure & Deployments
- **Infrastructure as Code (IaC):** Manage cloud resources using Terraform or CloudFormation. Manual dashboard configuration should be avoided.
- **SSL/TLS:** Force HTTPS redirects for all client-facing traffic. Terminate SSL at load balancers.
- **Environment Separation:** Maintain completely isolated staging and production environments with distinct database endpoints and API keys.

---

*This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant.*
