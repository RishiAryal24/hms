import os

from django.http import HttpResponse


class RenderCorsPreflightMiddleware:
    """
    Answer browser CORS preflight requests before tenant routing.
    This keeps Render static-site -> API requests working even when an OPTIONS
    request has no tenant-specific session/auth context.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
            self._add_cors_headers(request, response)
            return response

        response = self.get_response(request)
        self._add_cors_headers(request, response)
        return response

    def _add_cors_headers(self, request, response):
        origin = request.headers.get("Origin")
        if not origin:
            return

        allowed_origins = {
            item.strip()
            for item in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
            if item.strip()
        }

        allow_render_origins = origin.endswith(".onrender.com")
        if origin in allowed_origins or allow_render_origins:
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = (
                "accept, authorization, content-type, origin, user-agent, "
                "x-csrftoken, x-requested-with"
            )
