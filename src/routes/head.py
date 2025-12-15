# routes/main.py
from flask import Blueprint, render_template, send_from_directory
import os

head_bp = Blueprint('head', __name__)

@head_bp.route('/')
def index():
    return render_template('vector_editor.html')

@head_bp.route('/editor')
def editor():
    return render_template('editor.html')

@head_bp.route('/projects')
def projects():
    return render_template('projects.html')

# Статические файлы
@head_bp.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)