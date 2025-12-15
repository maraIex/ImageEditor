from flask import Flask, render_template, request, jsonify, send_file
import os
import json
from datetime import datetime


from src.routes import canvas_routes, image_routes, \
    transform_routes, filter_routes, head, api

from src.three_d import scene_routes as three_d_routes

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config['SECRET_KEY'] = 'vector-editor-secret-key'
app.config['PROJECTS_FOLDER'] = 'projects'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB

# Создаем папки
for folder in ['uploads', 'projects', 'exports']:
    os.makedirs(folder, exist_ok=True)

@app.route("/")
def root():
    return render_template("editor_shell.html")

@app.route("/editor")
def editor_shell():
    return render_template("editor_shell.html")

@app.route("/raster")
def raster_editor():
    # Растровый редактор
    return render_template("index.html")

@app.route("/vector")
def vector_editor():
    # Векторный редактор
    return render_template("vector_editor.html")

@app.route("/3d")
def three_d_editor():
    # 3D редактор
    return render_template("3d_viewer.html")


app.register_blueprint(canvas_routes.bp)
app.register_blueprint(image_routes.bp)
app.register_blueprint(transform_routes.bp)
app.register_blueprint(filter_routes.bp)
app.register_blueprint(three_d_routes.bp)
app.register_blueprint(vector_head.head_bp)
app.register_blueprint(vector_api.api_bp)

if __name__ == "__main__":
    app.run(debug=True)