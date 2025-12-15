from flask import Flask, render_template

from src.routes import canvas_routes
from src.routes import filter_routes
from src.routes import image_routes
from src.routes import transform_routes
from src.utils.file_utils import ensure_directory

app = Flask(__name__)

# ===================== BLUEPRINTS =====================
app.register_blueprint(image_routes.bp)
app.register_blueprint(transform_routes.bp)
app.register_blueprint(filter_routes.bp)
app.register_blueprint(canvas_routes.bp)

# ===================== ROUTE INDEX =====================
@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)
