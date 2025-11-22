"""Simple test function to verify Netlify Python functions work."""

def handler(event, context):
    """Test handler that just returns success."""
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'text/html'},
        'body': '<h1>Hello from Netlify Functions!</h1><p>Python function is working.</p>'
    }
