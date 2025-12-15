# app.py
from flask import Flask, render_template, jsonify, request, send_file
import os
import json
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Создаем папки если их нет
for folder in ['uploads', 'projects', 'exports']:
    os.makedirs(folder, exist_ok=True)

# Регистрируем blueprints
from src.routes.head import head_bp
from src.routes.api import api_bp

app.register_blueprint(head_bp)
app.register_blueprint(api_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True, port=5000)