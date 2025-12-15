from flask import Blueprint, request, jsonify


def create_canvas_routes(canvas_service):
    """
    Роуты для изменения размеров холста (canvas)
    """
    bp = Blueprint("canvas_routes", __name__)

    @bp.route("/canvas/resize", methods=["POST"])
    def resize():
        data = request.json
        width = int(data["width"])
        height = int(data["height"])
        canvas_service.resize(width, height)
        return jsonify({"message": "Размер изменён"})

    return bp
