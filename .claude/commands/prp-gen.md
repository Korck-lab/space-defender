# Create PRP

## Feature file: $ARGUMENTS

## Product Requirement Prompt (PRP) Template

*Use this structured template to outline a comprehensive Product Requirement Prompt for AI-assisted software design (excluding embedded systems). Each section includes guidance on what to include, ensuring coverage from high-level vision to technical details and validation. Replace the instructions and examples with content specific to your project.*

## Product Overview

*Provide a brief description of the product, including its purpose, target users, and main objective. Explain the core problem it solves or the opportunity it addresses. Keep it concise and engaging to set the context.*

**Example:** *“XPlatform is a cross-device task management app designed for remote teams. It simplifies project tracking and collaboration, enabling users to create, assign, and monitor tasks in real time. The objective is to improve team productivity and transparency by centralizing project communications and deadlines.”*

## Background & Research

*Summarize any relevant background, user research, or academic findings that inform the product’s direction. Include market analysis, user pain points, or prior solutions, and **cite references for key facts or studies**. Highlight why this product is needed and any supporting data or trends.*

**Example Insights:**

* *Industry trends show a growing demand for remote collaboration tools post-2020.*
* *Research indicates that well-designed collaboration software can boost team efficiency by over 30%. For instance, one study found that adding gamification elements increased user engagement by nearly 50%, suggesting that incorporating rewards or feedback loops could significantly improve user retention.*
* *According to a 2023 Requirements Engineering study, high-quality upfront requirements reduce defects in later development stages, underscoring the importance of clear initial specifications.*

## Key Functional Requirements

*List and describe the core features and functionalities the product **must** have. Each requirement should be phrased clearly (as a **“shall”** or **“should”** statement, or as a user story) and include the expected behavior or outcome.*

* ***Feature 1:** \[Title] – Description of what this feature does and why. (e.g., “**User Registration:** The system shall allow new users to create an account using email or social login, with email verification to confirm identity.”)*
* ***Feature 2:** \[Title] – Description of the next critical feature or use case. (e.g., “**Task Assignment:** Users can assign tasks to team members with due dates and priority labels. The assignee should receive a notification.”)*
* ***Feature 3:** \[Title] – Continue listing all primary features needed for a viable product. Include details like inputs, outputs, or conditions for each.*

*(Ensure each functional requirement is testable and unambiguous.)*

## Non-Functional Requirements

*Specify important quality attributes and constraints for the product. These are the criteria that define how the system performs rather than what it does.*

* ***Performance:** Requirements about speed, responsiveness, or capacity (e.g., “The app should handle 10,000 concurrent users with sub-second response times for typical requests.”).*
* ***Security:** Security and privacy expectations (e.g., “All user data must be encrypted at rest and in transit; comply with OWASP top 10 practices for web security.”).*
* ***Reliability:** Uptime or fault tolerance (e.g., “99.9% uptime monthly; the system should gracefully handle server failures with automatic failover.”).*
* ***Scalability:** Ability to grow (e.g., “The architecture should support scaling horizontally to accommodate a 2x increase in users without significant refactoring.”).*
* ***Usability:** User experience considerations (e.g., “The interface should follow accessibility guidelines (WCAG 2.1) and be intuitive for non-technical users.”).*

*(Include other NFRs such as maintainability, portability, localization, etc., as relevant. Each should be measurable or observable.)*

## Architecture

*Describe the proposed technical architecture and design approach. Outline the system’s high-level structure, including major components or layers (e.g., client-server, microservices, modules, third-party integrations). Explain how components interact and any key design patterns or frameworks used.*

* *Mention how data flows through the system (for example, user interface -> API -> database, etc.).*
* *Identify key components (e.g., **Frontend**, **Backend**, **Database**, **Authentication Service**, etc.) and how they communicate.*
* *Highlight any noteworthy design decisions (e.g., use of MVC pattern, microservice vs. monolith, cloud services, messaging queues for asynchronous processing, etc.).*

*For example, you might note:* \**“The architecture follows a microservices approach with separate services for auth, task management, and notifications. Services communicate via REST APIs (or GraphQL), and a message broker (e.g., RabbitMQ) handles asynchronous events. The frontend (React app) interacts with these services through an API Gateway. Data is stored in a PostgreSQL database, and Redis is used for caching.”*

*(Optional: Include an **architecture diagram** to illustrate components and their interactions. Diagram could show user clients, web servers, service layers, databases, external APIs, etc.)*

*![Architecture Diagram Placeholder – e.g., a diagram showing client, server, database, and integration points](#)*

## Modularity Plan

*Define the system’s modules or components and their responsibilities. Explain how the solution is broken into distinct, self-contained parts to enhance maintainability and scalability. This section ensures clarity on boundaries and extension points for future development.*

* *List each module/component, with a short description of its role. For example:*

  * ***Authentication Module:** Handles user login, registration, and identity management (could be isolated as a microservice or a separate component). It provides APIs for other services to validate users.*
  * ***Task Management Module:** Core logic for creating, updating, and tracking tasks. Encapsulates all business rules related to tasks and assignments.*
  * ***Notification Module:** Sends out email or push notifications for important events (task assigned, task due, etc.), possibly using an external service.*
  * *... (Continue for other modules like UI, Database layer, Reporting, etc.)*

*Describe how modules interact (e.g., via APIs, events) and ensure low coupling (changes in one module minimally affect others). Emphasize the benefits of this modular approach, such as easier scalability and maintenance. For instance, a modular architecture allows teams to add or modify features without overhauling the entire codebase.*

## Technology Stack

*List the technologies and tools chosen for implementation, along with versions or links to documentation. This anchors the project in concrete tech and helps AI or developers understand the environment.*
*Use context7 MCP to fetch up to date libraries and api's docummentation and examples*
* *Programming Languages:* e.g., **Python 3.11** – for backend logic (chosen for its rich ecosystem and fast development)
* *Frameworks:* e.g., **FastAPI (Python)** – web framework for building the API; **React 18** – for building a dynamic frontend UI
* *Database:* e.g., **PostgreSQL 14** – relational database for persistent storage; **Redis 7** – in-memory data store for caching and quick lookups
* *Infrastructure:* e.g., **Docker** for containerization, **Kubernetes** for orchestration, **AWS** (EC2, S3, RDS) for cloud hosting
* *Libraries & Integrations:* e.g., **OAuth 2.0** libraries for authentication, **Stripe API** for payment processing (with latest API version)

*(Provide reasoning if necessary for critical choices, and ensure each item is clearly identified. You can format each technology as a bold term followed by a short note or link to its official docs for clarity.)*

## Code Examples

*Include sample code snippets, pseudocode, or interface definitions to illustrate key parts of the design. Focus on non-trivial functions or classes that show how the requirements might be implemented. This helps AI developers understand the expected structure and coding style.*

```python
# Example: A class interface for Task in the Task Management module
class Task:
    def __init__(self, title: str, assignee: str, due_date: datetime):
        self.id = generate_unique_id()
        self.title = title
        self.assignee = assignee
        self.due_date = due_date
        self.status = "open"

    def mark_complete(self):
        """Mark the task as completed and log completion time."""
        self.status = "completed"
        self.completed_at = datetime.now()
```

*You can also show an API endpoint example or pseudocode for an algorithm if relevant. For instance:*

```javascript
// Example: Pseudocode for notifying a user (could be part of Notification Module)
function notifyAssignee(taskId) {
  let task = TaskService.getTask(taskId);
  if (task.isOverdue()) {
    EmailService.send(task.assigneeEmail, "Task Overdue", "...message...");
  }
}
```

*The code examples should align with the chosen tech stack and demonstrate solving a piece of the requirements. Ensure to keep them concise and focused on clarity.*

## Core Test Cases

*Describe critical test scenarios to validate the product’s functionality and performance. List important **unit tests**, **integration tests**, and **end-to-end tests** that the system must pass. Include edge cases and failure modes to ensure robustness.*

* ***Basic Functionality:** e.g., “**User Registration** – Verify that a new user can register with valid details and receive a confirmation email. Test that duplicate emails are rejected.”*
* ***Edge Case:** e.g., “**Invalid Login Attempts** – Ensure the system locks out a user after 5 failed login attempts within 10 minutes and logs the event for auditing.”*
* ***Integration:** e.g., “**Task Assignment Notification** – When a task is assigned, the system should create a notification entry and send an email via the Notification module. Simulate the end-to-end flow to confirm all parts work together.”*
* ***Performance:** e.g., “**Load Test** – Simulate 1000 concurrent task creations to ensure the system and database can handle high throughput without timing out.”*
* ***Security:** e.g., “**Data Privacy** – Verify that a user cannot access another user’s tasks (attempt to fetch tasks with an unauthorized account should be denied with 403 Forbidden).”*

*(List each test case with a clear description of the scenario and the expected result. This helps ensure the AI or developers understand how the software will be verified and where to focus during implementation.)*

## Appendices

*Provide any additional information, references, or supporting material here:*

* ***References:** Cite all external sources, APIs, libraries, or research papers referenced in the above sections. For example, include links to standards or academic papers that influenced the design.*
* ***Glossary:** Define any specialized terms or acronyms used in the document (e.g., *PRP*, *OAuth*, *CRUD*, etc.) for clarity.*
* ***Diagrams and Tables:** Include supplementary diagrams (data models, workflow diagrams) or tables that were deferred from main sections to keep them concise.*
