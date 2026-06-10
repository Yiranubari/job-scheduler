const jobSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    type: { type: "string", example: "send_email" },
    payload: { type: "object", additionalProperties: true },
    priority: {
      type: "integer",
      enum: [1, 2, 3],
      description: "1=High, 2=Medium, 3=Low",
    },
    status: {
      type: "string",
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
    },
    scheduledAt: { type: "string", format: "date-time" },
    recurringInterval: {
      type: "string",
      nullable: true,
      enum: ["every_1_minute", "every_5_minutes", "every_1_hour", null],
    },
    retryCount: { type: "integer" },
    maxRetries: { type: "integer" },
    lastError: { type: "string", nullable: true },
    workerId: { type: "string", nullable: true },
    claimedAt: { type: "string", format: "date-time", nullable: true },
    inDlq: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const errorResponse = {
  type: "object",
  properties: {
    error: { type: "string" },
    details: {
      type: "array",
      items: {
        type: "object",
        properties: { path: { type: "string" }, message: { type: "string" } },
      },
    },
  },
};

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Job Scheduler API",
    version: "1.0.0",
    description:
      "Background job scheduler with heap-based priority queue, retries with exponential backoff and jitter, dead-letter queue, DAG dependencies, recurring jobs, and live updates over SSE.",
  },
  tags: [
    { name: "Jobs" },
    { name: "Dead-letter queue" },
    { name: "Dashboard" },
    { name: "Events" },
  ],
  paths: {
    "/api/jobs": {
      post: {
        tags: ["Jobs"],
        summary: "Create a job",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "payload"],
                properties: {
                  type: { type: "string", example: "send_email" },
                  payload: {
                    type: "object",
                    example: { to: "test@gmail.com", subject: "Welcome" },
                  },
                  priority: { type: "integer", enum: [1, 2, 3], default: 2 },
                  scheduledAt: { type: "string", format: "date-time" },
                  recurringInterval: {
                    type: "string",
                    enum: ["every_1_minute", "every_5_minutes", "every_1_hour"],
                  },
                  dependsOn: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                    description:
                      "Job IDs that must complete before this job runs. Cycles are rejected.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Job created",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: jobSchema } },
              },
            },
          },
          "400": {
            description: "Validation failed",
            content: { "application/json": { schema: errorResponse } },
          },
          "409": {
            description: "Dependency cycle",
            content: { "application/json": { schema: errorResponse } },
          },
        },
      },
      get: {
        tags: ["Jobs"],
        summary: "List jobs",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "pending",
                "processing",
                "completed",
                "failed",
                "cancelled",
              ],
            },
          },
          { name: "type", in: "query", schema: { type: "string" } },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated jobs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: jobSchema },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/jobs/{id}": {
      get: {
        tags: ["Jobs"],
        summary: "Get a job with its dependencies",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Job",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: jobSchema } },
              },
            },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: errorResponse } },
          },
        },
      },
    },
    "/api/jobs/{id}/cancel": {
      post: {
        tags: ["Jobs"],
        summary: "Cancel a job",
        description:
          "Only pending or processing jobs can be cancelled. If the job is mid-processing, the worker discards its result.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Cancelled",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: jobSchema } },
              },
            },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: errorResponse } },
          },
          "409": {
            description: "Job already in a terminal state",
            content: { "application/json": { schema: errorResponse } },
          },
        },
      },
    },
    "/api/jobs/{id}/restart": {
      post: {
        tags: ["Jobs"],
        summary: "Restart a cancelled job",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Restarted",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: jobSchema } },
              },
            },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: errorResponse } },
          },
          "409": {
            description: "Job is not cancelled",
            content: { "application/json": { schema: errorResponse } },
          },
        },
      },
    },
    "/api/dlq": {
      get: {
        tags: ["Dead-letter queue"],
        summary: "List dead-letter jobs",
        responses: {
          "200": {
            description: "DLQ jobs with error details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "array", items: jobSchema } },
                },
              },
            },
          },
        },
      },
    },
    "/api/dlq/{id}/retry": {
      post: {
        tags: ["Dead-letter queue"],
        summary: "Manually retry a dead-letter job",
        description:
          "Resets retry count and requeues. Optionally accepts a corrected payload.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  payload: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Requeued",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: jobSchema } },
              },
            },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: errorResponse } },
          },
          "409": {
            description: "Job is not in the DLQ",
            content: { "application/json": { schema: errorResponse } },
          },
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Job counts by status",
        responses: {
          "200": {
            description: "Counts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        counts: {
                          type: "object",
                          additionalProperties: { type: "integer" },
                        },
                        dlqSize: { type: "integer" },
                        total: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/events": {
      get: {
        tags: ["Events"],
        summary: "Server-Sent Events stream of job updates",
        description:
          "Long-lived text/event-stream connection. Each event's data is a full Job object reflecting a status change. Consumed by the UI for live updates.",
        responses: {
          "200": {
            description: "SSE stream",
            content: { "text/event-stream": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Dashboard"],
        summary: "Health check",
        responses: { "200": { description: "OK" } },
      },
    },
  },
};
