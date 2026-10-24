type Application = {
  name: string

  email: string

  signal: string

  contribution: string
}

const recipient = "ayushsingh160909@gmail.com"

const maxBodyBytes = 65_536

const allowedFields = new Set([
  "name",
  "email",
  "signal",
  "contribution",
  "website",
])

function jsonResponse(body: object, status: number, origin?: string): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",

    "Content-Type": "application/json; charset=utf-8",

    Vary: "Origin",
  })

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin)

    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")

    headers.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key")

    headers.set("Access-Control-Max-Age", "600")
  }

  return new Response(JSON.stringify(body), { status, headers })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sanitizeField(
  value: unknown,
  maxLength: number,
  multiline = false,
): string | null {
  if (typeof value !== "string") return null

  const controlCharacters = multiline
    ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
    : /[\u0000-\u001f\u007f]/g

  const sanitized = value.normalize("NFC").replace(controlCharacters, "").trim()

  return sanitized.length > 0 && sanitized.length <= maxLength
    ? sanitized
    : null
}

async function readLimitedBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader()

  if (!reader) return ""

  const decoder = new TextDecoder()

  let result = ""

  let bytesRead = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) return result + decoder.decode()

      bytesRead += value.byteLength

      if (bytesRead > maxBodyBytes) {
        await reader.cancel()

        return null
      }

      result += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;"

      case "<":
        return "&lt;"

      case ">":
        return "&gt;"

      case '"':
        return "&quot;"

      default:
        return "&#39;"
    }
  })
}

function formatHtmlField(label: string, value: string): string {
  const content = escapeHtml(value).replace(/\n/g, "<br>")

  return `<p><strong>${label}</strong><br>${content}</p>`
}

function formatTextField(label: string, value: string): string {
  return `${label}\n${value}`
}

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get("Origin")

    if (!origin || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: "origin_not_allowed" }, 403)
    }

    const url = new URL(request.url)

    if (url.pathname !== "/api/application") {
      return jsonResponse({ error: "not_found" }, 404, origin)
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": origin,

          "Access-Control-Allow-Methods": "POST, OPTIONS",

          "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",

          "Access-Control-Max-Age": "600",

          "Cache-Control": "no-store",

          Vary: "Origin",
        },
      })
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, origin)
    }

    const contentLength = Number(request.headers.get("Content-Length") ?? 0)

    if (contentLength > maxBodyBytes) {
      return jsonResponse({ error: "payload_too_large" }, 413, origin)
    }

    if (
      !request.headers
        .get("Content-Type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return jsonResponse({ error: "invalid_request" }, 400, origin)
    }

    const clientIp = request.headers.get("CF-Connecting-IP")

    const { success: withinLimit } = await env.SUBMISSION_LIMITER.limit({
      key: clientIp ?? "unknown",
    })

    if (!withinLimit) {
      return jsonResponse({ error: "rate_limited" }, 429, origin)
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") ?? ""

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      return jsonResponse({ error: "invalid_request" }, 400, origin)
    }

    const bodyText = await readLimitedBody(request)

    if (bodyText === null) {
      return jsonResponse({ error: "payload_too_large" }, 413, origin)
    }

    let body: unknown

    try {
      body = JSON.parse(bodyText)
    } catch {
      return jsonResponse({ error: "invalid_request" }, 400, origin)
    }

    if (
      !isRecord(body) ||
      Object.keys(body).some((field) => !allowedFields.has(field))
    ) {
      return jsonResponse({ error: "invalid_request" }, 400, origin)
    }

    if (typeof body.website === "string" && body.website.trim()) {
      return jsonResponse({ error: "invalid_request" }, 400, origin)
    }

    const application: Application | null = (() => {
      const name = sanitizeField(body.name, 100)

      const email = sanitizeField(body.email, 254)

      const signal = sanitizeField(body.signal, 3_000, true)

      const contribution = sanitizeField(body.contribution, 3_000, true)

      if (
        !name ||
        !email ||
        !signal ||
        !contribution ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      )
        return null

      return { name, email, signal, contribution }
    })()

    if (!application) {
      return jsonResponse({ error: "invalid_request" }, 400, origin)
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      console.error(
        JSON.stringify({ event: "application_email_not_configured" }),
      )

      return jsonResponse({ error: "submission_unavailable" }, 503, origin)
    }

    const submittedAt = new Date().toISOString()

    const safeName = application.name.replace(/[\r\n]/g, " ").slice(0, 100)

    const subject = `ASB9 Club application: ${safeName} | ${submittedAt}`

    const text = [
      "ASB9 CLUB — MEMBERSHIP APPLICATION",

      `Submitted: ${submittedAt}`,

      "",

      formatTextField("Applicant name", application.name),

      formatTextField("Applicant email", application.email),

      formatTextField("What they are working on", application.signal),

      formatTextField("What they would contribute", application.contribution),
    ].join("\n\n")

    const html = [
      "<h1>ASB9 CLUB — MEMBERSHIP APPLICATION</h1>",

      `<p><strong>Submitted:</strong> ${submittedAt}</p>`,

      formatHtmlField("Applicant name", application.name),

      formatHtmlField("Applicant email", application.email),

      formatHtmlField("What they are working on", application.signal),

      formatHtmlField("What they would contribute", application.contribution),
    ].join("")

    let providerResponse: Response

    try {
      providerResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",

        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,

          "Content-Type": "application/json",

          "Idempotency-Key": idempotencyKey,
        },

        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,

          to: [recipient],

          reply_to: application.email,

          subject,

          text,

          html,
        }),
      })
    } catch {
      console.error(
        JSON.stringify({ event: "application_email_transport_failed" }),
      )

      return jsonResponse({ error: "submission_unconfirmed" }, 502, origin)
    }

    if (!providerResponse.ok) {
      console.error(
        JSON.stringify({
          event: "application_email_provider_rejected",

          status: providerResponse.status,
        }),
      )

      return jsonResponse({ error: "submission_unconfirmed" }, 502, origin)
    }

    console.log(JSON.stringify({ event: "application_email_accepted" }))

    return jsonResponse({ ok: true }, 202, origin)
  },
} satisfies ExportedHandler<Cloudflare.Env>
