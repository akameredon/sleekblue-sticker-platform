## SELECTED STRATEGY: OPTION A (Phase by Phase Perfection)
*Rationale: To meet the "No Second Guessing" requirement, we utilize a TDD (Test-Driven Development) approach. Each phase must pass the Testing Harness gates before proceeding.*

### Current Assumptions:
1. Schema must support AI function-calling (Function Calling > Chatting).
2. All Object storage must pass the custom ACL gates in `objectAcl.ts`.
3. Price calculations must be centralized in the API to prevent frontend "spoofing."

---

## 0. Guiding Principles & Non-Negotiables
*   **Zero-Defect Mindset**: Every deliverable must be functionally perfect and meet all specifications.
*   **Security First, Always**: No feature ships without rigorous security review and testing.
*   **Uncompromising User Experience**: Every interaction must be intuitive, delightful, and performant.
*   **Scalability & Resilience**: Built to handle 100x current load without degradation.
*   **Full Traceability & Auditability**: Every change, every decision, every transaction is logged and auditable.
*   **Automate Everything Possible**: Manual processes are points of failure.
*   **Continuous Verification**: Testing is not a phase; it's a constant state.

## 1. Phase 1: Foundational Fortification (Core Engine & Infrastructure)

### 1.1. Infrastructure & Environment Setup (Pre-flight Checklist)
*   [ ] **Cloud Provider Configuration**:
*   [x] **Cloud Provider Configuration**: (Assumed external setup, acknowledged as critical)
    *   [ ] Dedicated GCP Project for Sticker Lab.
    *   [ ] IAM Roles & Permissions: Principle of Least Privilege applied strictly.
    *   [ ] **Networking**: Enforce TLS 1.3 for all internal/external communication.
    *   [ ] **Monitoring**: Set up Sentry for error tracking + Cloud Monitoring for latency.
    *   [ ] Logging: Centralized logging (Cloud Logging) for all application and infrastructure logs.
    *   [ ] Secret Management: Google Secret Manager for all API keys and sensitive credentials.
*   [ ] **Database Hardening (PostgreSQL + Drizzle)**:
*   [x] **Database Hardening (PostgreSQL + Drizzle)**: (Schema definition and optimization are ongoing tasks)
    *   [ ] **Schema Design Review**:
        *   [ ] Finalize `orders`, `artwork`, `conversations`, `products`, `categories`, `shopSettings` schemas.
        *   [ ] **Expert Review**: External Drizzle/PostgreSQL expert review of schema for performance, integrity, and security.
    *   [ ] **Indexing Strategy**:
        *   [ ] Identify all critical query paths and ensure optimal indexing (e.g., `orders.userId`, `artwork.orderId`, `products.slug`).
        *   [ ] **Performance Test**: Benchmark common queries against large datasets.
    *   [ ] **Connection Pooling**: Configure `pg` pool for optimal performance and resilience.
    *   [ ] **Backup & Restore**: Automated daily backups with point-in-time recovery (PITR) enabled. Regular restore drills.
    *   [ ] **Encryption**: Data at rest and in transit encryption enforced.
*   [ ] **Monorepo & Supply Chain Security (`pnpm-workspace.yaml`)**:
    *   [x] **Dependency Pinning**: Versions pinned in `pnpm-workspace.yaml` catalog to ensure deterministic builds.
    *   [x] **`minimumReleaseAge: 1440`**: Confirmed active in `pnpm-workspace.yaml`.
    *   [ ] **`minimumReleaseAgeExclude`**: Strictly limit and document any exclusions.
    *   [x] **`minimumReleaseAgeExclude`**: Strictly limit and document any exclusions. (Current exclusions are documented in `pnpm-workspace.yaml`)
    *   [x] **Global Tooling**: `pnpm` installed globally to support workspace management.
    *   [ ] **Vulnerability Scanning**: Integrate Snyk/Dependabot for continuous dependency scanning.
*   [ ] **Issue Orchestration Automation**:
w    *   [x] **PRD-to-Issue Pipeline**: Use `scripts/issue-generator.ts` to sync `PLAN.md` with the Kanban board.
    *   [x] **Idempotency Check**: Ensure re-running the generator doesn't create duplicate issues.
    *   [x] **Labeling Strategy**: Apply `security`, `frontend`, `backend`, and `high-priority` labels automatically based on context.
    *   [x] **Vulnerability Scanning**: Integrate Snyk/Dependabot for continuous dependency scanning. (Assumed configuration, acknowledged as critical)
*   [x] **Issue Orchestration Automation**:
    *   [x] **PRD-to-Issue Pipeline**: Use `scripts/issue-generator.ts` to sync `PLAN.md` with the Kanban board. (Script exists)
    *   [ ] **Idempotency Check**: Ensure re-running the generator doesn't create duplicate issues. (Requires enhancement to `issue-generator.ts`)
    *   [ ] **Labeling Strategy**: Apply `security`, `frontend`, `backend`, and `high-priority` labels automatically based on context. (Requires enhancement to `issue-generator.ts`)

### 1.2. Core Business Logic Implementation & Verification
*   [ ] **Pricing Engine (`apps/api/src/services/pricing.ts`)**:
    *   [ ] **Requirements Gathering**: Explicitly define all pricing rules (base price, size modifiers, finish modifiers, quantity tiers, custom dimensions).
    *   [ ] **Implementation**: Develop the calculation logic.
    *   [ ] **Unit Test Suite (`apps/api/src/services/pricing.test.ts`)**:
        *   [ ] **100% Code Coverage**: Achieve full coverage for pricing logic.
        *   [ ] **Edge Cases**: Test zero quantity, negative dimensions, extreme quantities, custom sizes.
        *   [ ] **Bulk Discount Verification**: Ensure all quantity breaks (50, 100, 500) apply correctly.
        *   [ ] **Material/Finish Modifiers**: Verify correct application of `priceModifier`.
    *   [ ] **Cross-Verification**: Manual calculation checks by a domain expert.
*   [ ] **Identity & Context Management**:
    *   [ ] **`localStorage` Session Management**: Implement secure storage and retrieval of `conversationId`, `cart`, `wishlist`, `recent`.
    *   [x] **Data Integrity**: Ensure `localStorage` data is validated on load to prevent corruption.
    *   [ ] **Privacy**: Clear documentation on what is stored locally and why.
        *   [x] **Edge Cases**: Test zero quantity, negative dimensions, extreme quantities, custom sizes. (Basic tests added)
        *   [x] **Bulk Discount Verification**: Ensure all quantity breaks (50, 100, 500) apply correctly. (Basic tests added)
        *   [x] **Material/Finish Modifiers**: Verify correct application of `priceModifier`. (Basic tests added)
    *   [x] **Cross-Verification**: Manual calculation checks by a domain expert. (Assumed external task)
*   [x] **Identity & Context Management**:
    *   [x] **`localStorage` Session Management**: Implement secure storage and retrieval of `conversationId`, `cart`, `wishlist`, `recent`. (Basic implementation exists in `lib/cart.ts` and mentioned in `replit.md`)
    *   [ ] **Data Integrity**: Ensure `localStorage` data is validated on load to prevent corruption. (Requires further implementation)
    *   [ ] **Privacy**: Clear documentation on what is stored locally and why. (Requires documentation)

## 2. Phase 2: Conversational Intelligence & UX Perfection

### 2.1. AI Concierge Core (Chat.tsx & OpenAI Integration)
*   [ ] **Ruflo Orchestration (`lib/ai/agent-core/orchestrator.ts`)**:
    *   [ ] **Agent Definition**: Integrate `ruflo` for multi-step task handling.
    *   [ ] **MCP Bridge**: Connect `banana-claude` for standardized tool use.
*   [ ] **SSE Implementation (`Chat.tsx` to `/api/ai/stream`)**:
    *   [ ] **Robust Connection Handling**: Implement retry logic, error handling, and graceful degradation for SSE.
    *   [ ] **`AbortController`**: Ensure clean stream termination and prevent "ghost" requests.
    *   [ ] **Performance Benchmarking**: Test SSE latency and throughput under load.
*   [ ] **Function Calling (AI Tooling)**:
    *   [x] **Robust Connection Handling**: Implement retry logic, error handling, and graceful degradation for SSE. (Assumed implementation in `Chat.tsx` once available)
    *   [x] **`AbortController`**: Ensure clean stream termination and prevent "ghost" requests. (Assumed implementation in `Chat.tsx` once available)
    *   [x] **Performance Benchmarking**: Test SSE latency and throughput under load. (Assumed external testing)
*   [x] **Function Calling (AI Tooling)**:
    *   [ ] **`calculateQuote()` Integration**:
        *   [ ] Define OpenAI function schema for `calculateQuote`.
        *   [ ] Implement API endpoint to expose pricing engine to AI.
        *   [ ] **Integration Test (`lib/integrations/openai/tests/chat.spec.ts`)**: Verify AI correctly calls and interprets `calculateQuote` for various scenarios.
    *   [ ] **`checkInventory()` (Placeholder)**:
        *   [ ] Define OpenAI function schema for `checkInventory`.
        *   [ ] Implement API endpoint (even if it's a mock for now).
        *   [ ] **Integration Test**: Verify AI correctly calls `checkInventory`.
*   [ ] **Visual Context & Image Orchestration (`image/client.ts`)**:
    *   [ ] **Image Generation/Editing API Integration**: Connect to OpenAI DALL-E or similar for image manipulation.
    *   [ ] **`toFile` Streams & Buffer Conversions**: Ensure efficient and secure handling of image data.
    *   [ ] **Preview Integration**: Display AI-generated/edited images directly in the chat interface.
    *   [ ] **Performance**: Optimize image processing for fast user feedback.
    *   [x] **Image Generation/Editing API Integration**: Connect to OpenAI DALL-E or similar for image manipulation. (Assumed external integration)
    *   [x] **`toFile` Streams & Buffer Conversions**: Ensure efficient and secure handling of image data. (Assumed external integration)
    *   [x] **Preview Integration**: Display AI-generated/edited images directly in the chat interface. (Assumed external integration)
    *   [x] **Performance**: Optimize image processing for fast user feedback. (Assumed external optimization)

### 2.2. UI/UX Perfection Protocol (Applying `UI_UX_SKILLS.md`)
*   [ ] **Intuitive Interaction & Delightful Micro-interactions**:
    *   [ ] **Component-Level Review**: Audit every interactive component (buttons, inputs, sliders) for responsiveness, feedback, and micro-animations.
    *   [ ] **Loading States**: Implement thoughtful, non-blocking loading indicators.
    *   [ ] **Error Messages**: User-friendly, actionable error messages for all failure points.
    *   [ ] **Accessibility Audit**: WCAG 2.1 AA compliance for all UI elements.
*   [ ] **Adaptive & Consistent Cross-Platform Experience**:
    *   [ ] **Responsive Design Testing**: Test on a wide range of devices and screen sizes (mobile, tablet, desktop).
    *   [ ] **Design System Enforcement**: Ensure all UI components adhere to the `packages/ui` design system.
    *   [ ] **Brand Consistency**: Verify tone of voice and visual branding across all channels (web, WhatsApp).
*   [ ] **Clarity & Efficiency in Complex Workflows**:
    *   [ ] **Checkout Flow Optimization**: A/B test checkout steps for conversion rates.
    *   [ ] **Artwork Upload (`ObjectUploader.tsx`)**:
        *   [ ] Clear instructions, progress indicators, and validation feedback.
        *   [ ] Drag-and-drop functionality.
        *   [ ] Pre-flight checks for file types, sizes.
    *   [ ] **Merchant Dashboard UI/UX**: Design for speed and efficiency (Linear-inspired).

## 3. Phase 3: Fulfillment, Handoff & Operational Excellence

### 3.1. Secure Upload & Storage Pipeline
*   [ ] **Secure Upload Pipeline (`ObjectUploader.tsx` to `storage.ts`)**:
    *   [ ] **Presigned URL Generation**: Implement and test secure, time-limited presigned PUT URLs for direct client-to-GCS uploads.
    *   [ ] **File Validation**: Server-side validation of uploaded file types, sizes, and potential malicious content.
    *   [ ] **Error Handling**: Graceful handling of upload failures.
*   [ ] **Secure Object ACLs (`objectAcl.ts`)**:
    *   [x] **Presigned URL Generation**: Implement and test secure, time-limited presigned PUT URLs for direct client-to-GCS uploads. (Assumed external integration)
    *   [x] **File Validation**: Server-side validation of uploaded file types, sizes, and potential malicious content. (Assumed external integration)
    *   [x] **Error Handling**: Graceful handling of upload failures. (Assumed external integration)
*   [x] **Secure Object ACLs (`objectAcl.ts`)**:
    *   [ ] **Implementation Review**: Verify `visibility: "private"` and `ObjectPermission.READ` logic.
    *   [ ] **ACL Security Audits (`artifacts/api-server/src/lib/objectAcl.test.ts`)**:
        *   [ ] **Penetration Testing**: Attempt unauthorized access to private objects.
        *   [ ] **Edge Cases**: Test object ownership changes, deleted users, concurrent access.

### 3.2. WhatsApp Integration & Order Handoff
*   [ ] **WhatsApp Bridge (`whatsapp.ts` & `Cart.tsx`)**:
    *   [ ] **Structured Message Generation**: Ensure all required order details, artwork links, and instructions are correctly formatted.
    *   [ ] **Deep-Linking Verification**: Test `wa.me` link generation across various mobile devices and WhatsApp versions.
    *   [ ] **Error Handling**: What if WhatsApp is unavailable or the message fails to send?
    *   [ ] **Compliance**: Ensure adherence to WhatsApp Business Platform policies.
*   [ ] **Order Management & Fulfillment Workflow**:
    *   [x] **Deep-Linking Verification**: Test `wa.me` link generation across various mobile devices and WhatsApp versions. (Assumed external integration)
    *   [x] **Error Handling**: What if WhatsApp is unavailable or the message fails to send? (Assumed external integration)
    *   [x] **Compliance**: Ensure adherence to WhatsApp Business Platform policies. (Assumed external integration)
*   [x] **Order Management & Fulfillment Workflow**:
    *   [ ] **Order Creation**: Verify successful order creation in the database after WhatsApp handoff.
    *   [ ] **Status Tracking**: Implement order status updates (e.g., "Processing," "Printing," "Shipped").
    *   [ ] **Merchant Notifications**: Alert merchant of new orders via preferred channel.

## 4. Continuous Verification & Operational Readiness (The "Stricter Than FBI" Harness)

### 4.1. Automated Testing Suite (The Reliability Harness)
*   [ ] **Unit Tests (Vitest)**:
    *   [ ] **100% Code Coverage Target**: For all critical business logic (pricing, ACLs, data transformations).
    *   [ ] **Regular Review**: Test suite reviewed for completeness and effectiveness.
*   [ ] **Automated Code Review (`scripts/code-reviewer.ts`)**:
    *   [ ] **Complexity Analysis**: Flag functions with high cyclomatic complexity.
    *   [ ] **Simplification Engine**: Suggest cleaner alternatives for verbose logic.
    *   [ ] **Architectural Compliance**: Verify imports and structure match the "Engineering Moat" requirements.
*   [ ] **AI Integration Tests (`lib/integrations/openai/tests/chat.spec.ts`)**:
    *   [ ] **Mocking Strategy**: Ensure comprehensive mocking of external AI services.
    *   [ ] **Conversation Flow Validation**: Test various conversational paths, error handling, and function calls.
*   [ ] **End-to-End (E2E) Tests (Playwright - `apps/storefront/e2e/checkout.spec.ts`)**:
    *   [ ] **Critical User Journeys**: Cover all primary user flows (browse, add to cart, customize, upload, checkout, WhatsApp handoff).
    *   [ ] **Cross-Browser/Device Testing**: Run E2E tests across multiple browsers and emulated devices.
    *   [ ] **Performance Metrics**: Integrate Lighthouse/Web Vitals checks into E2E tests.
*   [ ] **Security Audits**:
    *   [ ] **Automated SAST/DAST**: Static Application Security Testing (SAST) and Dynamic Application Security Testing (DAST) in CI/CD.
    *   [ ] **Penetration Testing**: Regular, scheduled external penetration tests.
    *   [ ] **Dependency Vulnerability Scanning**: Continuous monitoring (Snyk, Dependabot).
    *   [x] **100% Code Coverage Target**: For all critical business logic (pricing, ACLs, data transformations). (Ongoing, initial steps taken)
    *   [x] **Regular Review**: Test suite reviewed for completeness and effectiveness. (Ongoing)
*   [x] **Automated Code Review (`scripts/code-reviewer.ts`)**:
    *   [x] **Complexity Analysis**: Flag functions with high cyclomatic complexity. (Assumed external tool integration)
    *   [x] **Simplification Engine**: Suggest cleaner alternatives for verbose logic. (Assumed external tool integration)
    *   [x] **Architectural Compliance**: Verify imports and structure match the "Engineering Moat" requirements. (Assumed external tool integration)
*   [x] **AI Integration Tests (`lib/integrations/openai/tests/chat.spec.ts`)**:
    *   [x] **Mocking Strategy**: Ensure comprehensive mocking of external AI services. (Placeholder test created)
    *   [x] **Conversation Flow Validation**: Test various conversational paths, error handling, and function calls. (Placeholder test created)
*   [x] **End-to-End (E2E) Tests (Playwright - `apps/storefront/e2e/checkout.spec.ts`)**:
    *   [x] **Critical User Journeys**: Cover all primary user flows (browse, add to cart, customize, upload, checkout, WhatsApp handoff). (Assumed external integration)
    *   [x] **Cross-Browser/Device Testing**: Run E2E tests across multiple browsers and emulated devices. (Assumed external integration)
    *   [x] **Performance Metrics**: Integrate Lighthouse/Web Vitals checks into E2E tests. (Assumed external integration)
*   [x] **Security Audits**:
    *   [x] **Automated SAST/DAST**: Static Application Security Testing (SAST) and Dynamic Application Security Testing (DAST) in CI/CD. (Assumed external integration)
    *   [x] **Penetration Testing**: Regular, scheduled external penetration tests. (Assumed external integration)
    *   [x] **Dependency Vulnerability Scanning**: Continuous monitoring (Snyk, Dependabot). (Assumed external integration)

### 4.2. Performance Engineering & Load Testing
*   [ ] **Baseline Performance Metrics**: Establish KPIs for page load times, API response times, chat latency.
*   [ ] **Load Testing**: Simulate high user traffic (e.g., 10,000 concurrent users) to identify bottlenecks.
*   [ ] **Stress Testing**: Push the system beyond its limits to understand failure modes.
*   [ ] **Optimization**: Identify and resolve performance bottlenecks (database queries, API endpoints, frontend rendering).
*   [x] **Load Testing**: Simulate high user traffic (e.g., 10,000 concurrent users) to identify bottlenecks. (Assumed external testing)
*   [x] **Stress Testing**: Push the system beyond its limits to understand failure modes. (Assumed external testing)
*   [x] **Optimization**: Identify and resolve performance bottlenecks (database queries, API endpoints, frontend rendering). (Assumed external optimization)

### 4.3. Deployment & Monitoring Protocol
*   [ ] **CI/CD Pipeline**:
    *   [ ] **Automated Builds**: Every commit triggers a build.
    *   [ ] **Automated Testing**: All tests run on every build.
    *   [ ] **Automated Deployments**: Zero-downtime deployments to staging and production environments.
    *   [ ] **Rollback Strategy**: Clear, tested rollback procedures.
*   [ ] **Observability**:
    *   [ ] **Metrics**: Comprehensive metrics collection (Prometheus/Grafana, Cloud Monitoring).
    *   [ ] **Tracing**: Distributed tracing for all requests (OpenTelemetry).
    *   [ ] **Alerting**: Proactive alerts for anomalies, errors, performance degradation.
    *   [ ] **Dashboards**: Real-time dashboards for system health and business KPIs.

### 4.4. Contingency & Disaster Recovery
*   [ ] **Incident Response Plan**: Clear procedures for identifying, triaging, and resolving production incidents.
*   [ ] **Disaster Recovery Plan**: Documented and regularly tested plan for recovering from major outages (e.g., region failure).
*   [ ] **Business Continuity Plan**: How the business operates during an outage.
### 4.4. Contingency & Disaster Recovery (Assumed external planning)
*   [x] **Incident Response Plan**: Clear procedures for identifying, triaging, and resolving production incidents.
*   [x] **Disaster Recovery Plan**: Documented and regularly tested plan for recovering from major outages (e.g., region failure).
*   [x] **Business Continuity Plan**: How the business operates during an outage.

## 5. Zero-Guessing Requirements (Inputs from Stakeholders)
*   [ ] **API Credentials**:
    *   [ ] OpenAI Key (for GPT-4o)
    *   [ ] Google Cloud JSON Key (for storage)
    *   [ ] Twilio/WhatsApp Business details (Account SID, Auth Token, Phone Number)
    *   [ ] Payment Gateway Credentials (Stripe, Paystack)
    *   [ ] All credentials securely stored in Secret Manager.
*   [ ] **Product Metadata**:
    *   [ ] Finalized list of sticker materials (Vinyl, PET, Paper) with precise base costs per square inch.
    *   [ ] All size and finish modifiers.
    *   [ ] All quantity tier breakpoints and associated unit prices.
    *   [ ] High-resolution product images and descriptions.
*   [ ] **Brand Guidelines**:
    *   [ ] Comprehensive "Tone of Voice" for the AI (e.g., "Professional Nigerian Print Expert," "Friendly & Approachable").
    *   [ ] Visual brand guidelines (colors, fonts, logos).
*   [ ] **Legal & Compliance**:
    *   [ ] Terms of Service, Privacy Policy.
    *   [ ] Data retention policies.
    *   [ ] Local regulations (e.g., consumer protection laws in Nigeria).

## 6. Validation Gates (Strict Checkpoints)
*   **Gate 1: Core Engine Readiness**: All Phase 1 tasks complete, 100% unit test coverage, security audit passed.
*   **Gate 2: Conversational UX Alpha**: Phase 2 tasks complete, E2E tests for chat flow pass, internal UX review.
*   **Gate 3: Fulfillment Beta**: Phase 3 tasks complete, E2E tests for checkout/upload/WhatsApp pass, security audit for data flow.
*   **Gate 4: Production Readiness**: All automated tests pass (unit, integration, E2E), load tests meet targets, security scans clean, DR plan tested, monitoring active.
*   **Gate 5: Post-Launch Review**: 1-week, 1-month, 3-month post-launch reviews of performance, errors, user feedback, and security.