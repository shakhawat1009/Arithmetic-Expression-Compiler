#!/usr/bin/env python3
# Flask Backend API for Arithmetic Expression Compiler

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from mimetypes import guess_type
import os
import sys
from compiler_phases import compile_expression_pipeline

# Initialize Flask app
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR)
CORS(app)  # Enable CORS for all routes

# MIME type mapping for correct content-type headers
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
}


@app.route('/')
def serve_index():
    """Serves the main application page"""
    response = send_from_directory(BASE_DIR, 'index.html')
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
    return response


@app.route('/<path:path>')
def serve_static(path):
    """Serves static assets (CSS, JS, images, etc.) with correct MIME types"""
    file_path = os.path.join(BASE_DIR, path)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        # Get file extension
        _, ext = os.path.splitext(path)
        ext = ext.lower()
        
        # Get MIME type
        mime_type = MIME_TYPES.get(ext)
        if not mime_type:
            mime_type, _ = guess_type(file_path)
            if not mime_type:
                mime_type = 'application/octet-stream'
        
        response = send_from_directory(BASE_DIR, path)
        response.headers['Content-Type'] = mime_type
        response.headers['Cache-Control'] = 'public, max-age=3600'
        
        # Add proper Content-Disposition for image files when downloaded
        if ext in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg'):
            response.headers['Content-Disposition'] = f'inline; filename="{os.path.basename(path)}"'
        
        return response
    
    # Default to index.html for SPA routing
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/api/analyze', methods=['POST'])
def analyze_expression():
    """API endpoint to analyze arithmetic expressions across all 7 compiler stages"""
    try:
        data = request.get_json(silent=True) or {}
        expression = data.get('expression', '').strip()

        if not expression:
            return jsonify({
                'error': 'No expression provided. Please enter an arithmetic expression.',
                'error_type': 'Syntax Error',
                'stage': 'Lexical Analyzer',
                'output': {
                    'result': None,
                    'error': 'No expression provided.'
                }
            }), 400

        # Run complete 7-stage compiler pipeline
        result = compile_expression_pipeline(expression)

        # Status code: 200 even for compiler errors so frontend can render error stage tabs
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'error': f"Internal Compiler Error: {str(e)}",
            'error_type': 'Code Generation Error',
            'stage': 'Assembly Code',
            'output': {
                'result': None,
                'error': str(e)
            }
        }), 500


def run_server(port=None):
    if port is None:
        port = int(os.environ.get('PORT', 8000))
    print(f"==================================================")
    print(f"  Arithmetic Expression Compiler Server")
    print(f"  Running at: http://localhost:{port}")
    print(f"  Creator: K. M. Shakhawat Hossain")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=False)


if __name__ == '__main__':
    port = None
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
