"""OpenAPI/Swagger configuration for the API."""

openapi_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: rule.endpoint.startswith('api_'),
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs",
    # Auto-update configuration
    "auto_scan": True,  # Automatically scan for new endpoints
    "swagger_ui_config": {
        "docExpansion": "list",  # Show all endpoints
        "defaultModelsExpandDepth": 3,
        "displayRequestDuration": True,  # Show request duration
        "filter": True,  # Enable filtering of endpoints
        "showExtensions": True,
        "showCommonExtensions": True
    }
}

openapi_template = {
    "swagger": "2.0",
    "info": {
        "title": "NoteHub API",
        "description": "RESTful API for NoteHub - A beautiful note-taking application with JWT authentication",
        "contact": {
            "name": "NoteHub API Support",
            "url": "https://github.com/thienng-it/note-hub"
        },
        "version": "1.0.0"
    },
    "host": "localhost:5000",
    "basePath": "/api",
    "schemes": [
        "http",
        "https"
    ],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'"
        }
    },
    "tags": [
        {
            "name": "Authentication",
            "description": "User authentication and token management"
        },
        {
            "name": "Notes",
            "description": "Note management operations"
        },
        {
            "name": "Tasks",
            "description": "Task management operations"
        }
    ]
}
