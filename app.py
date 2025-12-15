from flask import Flask, render_template
from src.models.project_model import ProjectModel
from src.services.image_service import ImageService
from src.services.transform_service import TransformService
from src.services.filter_service import FilterService
from src.services.history_manager import HistoryManager
from src.services.canvas_service import CanvasService

from src.routes.canvas_routes import create_canvas_routes
from src.routes.filter_routes import create_filter_routes
from src.routes.image_routes import create_image_routes
from src.routes.transform_routes import create_transform_routes
from src.utils.file_utils import ensure_directory

UPLOAD_DIR = "uploads"


def create_app():
    app = Flask(__name__)
    ensure_directory(UPLOAD_DIR)

    # ===================== PROJECT & HISTORY =====================
    project = ProjectModel(UPLOAD_DIR)
    history = HistoryManager(project)

    # ===================== SERVICES =====================
    image_service = ImageService(project)
    transform_service = TransformService(project, history)
    filter_service = FilterService(project, history)
    canvas_service = CanvasService(project, history)

    # ===================== BLUEPRINTS =====================
    app.register_blueprint(create_image_routes(image_service))
    app.register_blueprint(create_transform_routes(transform_service))
    app.register_blueprint(create_filter_routes(filter_service))
    app.register_blueprint(create_canvas_routes(canvas_service))

    # ===================== ROUTE INDEX =====================
    @app.route("/")
    def index():
        return render_template("index.html")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
