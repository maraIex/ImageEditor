from flask import Blueprint, request, jsonify, send_file


def create_image_routes(image_service):
    """
    Роуты для работы с изображением (upload / undo / reset / clear / export)
    """
    bp = Blueprint("image_routes", __name__)

    @bp.route("/upload", methods=["POST"])
    def upload():
        file = request.files.get("image")
        if not file:
            return jsonify({"error": "Файл не выбран"}), 400

        image_service.upload_image(file.read())
        return jsonify({"message": "Загружено"})

    @bp.route("/undo", methods=["POST"])
    def undo():
        try:
            image_service.undo()
        except ValueError:
            return jsonify({"error": "Нет предыдущего состояния"}), 400
        return jsonify({"message": "Откат выполнен"})

    @bp.route("/reset", methods=["POST"])
    def reset():
        image_service.reset()
        return jsonify({"message": "Сброшено"})

    @bp.route("/clear", methods=["POST"])
    def clear():
        image_service.clear()
        return jsonify({"message": "Холст очищен"})

    @bp.route("/current", methods=["GET"])
    def current():
        base64_img = image_service.get_current_base64()
        return jsonify({"image": base64_img})

    @bp.route("/export", methods=["GET"])
    def export():
        fmt = request.args.get("format", "png")
        path = image_service.export(fmt)
        return send_file(path, as_attachment=True)

    return bp
