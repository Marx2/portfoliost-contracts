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
  const { NoopSpanExporter } = require("@opentelemetry/sdk-trace-base")
  return new NodeSDK({
    resource: createResource(opts.serviceName),
    metricReader: opts.metricReader,
    instrumentations: opts.instrumentations ?? [],
    traceExporter: opts.traceExporter ?? new NoopSpanExporter(),
  })
}

/**
 * Returns a Hono-compatible route handler that serves Prometheus text format.
 * Mount as `app.get('/metrics', metricsRouteHandler)`.
 */
export function buildMetricsRoute(exporter: PrometheusExporter) {
  return async (c: Context) => {
    const text = await serializePrometheus(exporter)
    return c.body(text, 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    })
  }
}

/**
 * Collect metrics from the exporter's reader and serialize to Prometheus text.
 */
async function serializePrometheus(exporter: PrometheusExporter): Promise<string> {
  const reader = (exporter as any)._reader as
    | { collect(): Promise<{ resourceMetrics: any[] }> }
    | undefined
  if (!reader) return "# metrics reader not ready\n"

  const serializer = (exporter as any)._serializer as
    | { serialize(resourceMetrics: any): string }
    | undefined

  const result = await reader.collect()
  const resourceMetrics = result?.resourceMetrics ?? []

  if (serializer && resourceMetrics.length > 0) {
    return serializer.serialize(resourceMetrics)
  }

  return fallbackSerialize(resourceMetrics)
}

function fallbackSerialize(resourceMetrics: any[]): string {
  const lines: string[] = []
  for (const rm of resourceMetrics) {
    for (const sm of rm.scopeMetrics ?? []) {
      for (const metric of sm.metrics ?? []) {
        const name = metric.descriptor?.name ?? metric.name ?? "unknown"
        for (const dp of metric.dataPoints ?? []) {
          const attrs = dp.attributes ?? dp.attributeMap ?? {}
          const labels = Object.entries(attrs)
            .map(([k, v]) => `${k}="${String(v)}"`)
            .join(",")
          const labelStr = labels ? `{${labels}}` : ""
          const val = dp.value ?? dp.sum ?? dp.lastValue ?? 0
          lines.push(`${name}${labelStr} ${val}`)
        }
      }
    }
  }
  return lines.length > 0 ? lines.join("\n") + "\n" : "# no metrics\n"
}
