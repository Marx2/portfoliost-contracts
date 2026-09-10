import type { Resource } from "@opentelemetry/resources"
import { resourceFromAttributes, defaultResource } from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import type { SpanExporter } from "@opentelemetry/sdk-trace-base"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import type { Instrumentation } from "@opentelemetry/instrumentation"
import type { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import type { Context } from "hono"

/**
 * Build an OTel Resource with standard pfire service attributes.
 */
export function createResource(serviceName: string): Resource {
  return defaultResource().merge(
    resourceFromAttributes({
      "service.name": serviceName,
      "service.version": process.env.APP_VERSION ?? "0.0.0-dev",
      "deployment.environment": process.env.NODE_ENV ?? "production",
    }),
  )
}

export interface CreateSdkOpts {
  serviceName: string
  metricReader: MetricReader
  instrumentations?: Instrumentation[]
  traceExporter?: SpanExporter
}

/**
 * Create and return a configured NodeSDK instance.
 * Call `sdk.start()` after receiving this.
 *
 * Traces default to NoopSpanExporter — wire Tempo exporter in D57.
 */
export function createSdk(opts: CreateSdkOpts): NodeSDK {
  const sdkOpts: ConstructorParameters<typeof NodeSDK>[0] = {
    resource: createResource(opts.serviceName),
    metricReader: opts.metricReader,
    instrumentations: opts.instrumentations ?? [],
  }
  if (opts.traceExporter) {
    sdkOpts.traceExporter = opts.traceExporter
  }
  return new NodeSDK(sdkOpts)
}

/**
 * Returns a Hono-compatible route handler that serves Prometheus text format.
 * Uses PrometheusExporter.getMetricsRequestHandler() — the public API.
 * Mount as `app.get('/metrics', metricsRouteHandler)`.
 */
export function buildMetricsRoute(exporter: PrometheusExporter) {
  const handler = exporter.getMetricsRequestHandler.bind(exporter)
  return (c: Context) =>
    new Promise<Response>((resolve, reject) => {
      const mockReq = { method: "GET", url: "/metrics", headers: {} } as any
      const mockRes = {
        statusCode: 200,
        setHeader(_k: string, _v: string) {},
        end(body: string | Buffer) {
          const text = Buffer.isBuffer(body) ? body.toString() : (body ?? "")
          resolve(
            c.body(text, 200, {
              "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
            }),
          )
        },
      }
      try {
        handler(mockReq, mockRes as any)
      } catch (err) {
        reject(err)
      }
    })
}
