import { onRequestGet as __api_preview_js_onRequestGet } from "/home/claude/wolsegak/functions/api/preview.js"
import { onRequestGet as __api_visits_js_onRequestGet } from "/home/claude/wolsegak/functions/api/visits.js"
import { onRequestPost as __api_visits_js_onRequestPost } from "/home/claude/wolsegak/functions/api/visits.js"
import { onRequest as ___middleware_js_onRequest } from "/home/claude/wolsegak/functions/_middleware.js"

export const routes = [
    {
      routePath: "/api/preview",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_preview_js_onRequestGet],
    },
  {
      routePath: "/api/visits",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_visits_js_onRequestGet],
    },
  {
      routePath: "/api/visits",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_visits_js_onRequestPost],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]