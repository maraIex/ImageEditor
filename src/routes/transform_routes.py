from flask import Blueprint, request, jsonify


def create_transform_routes(transform_service):
    """
    Роуты для геометрических преобразований изображения
    """
    bp = Blueprint("transform_routes", __name__)

    @bp.route("/transform/rotate", methods=["POST"])
    def rotate():
        angle = float(request.json["angle"])
        transform_service.rotate(angle)
        return jsonify({"message": "Поворот выполнен"})

    @bp.route("/transform/flip_horizontal", methods=["POST"])
    def flip_h():
        transform_service.flip_horizontal()
        return jsonify({"message": "Отражено горизонтально"})

    @bp.route("/transform/flip_vertical", methods=["POST"])
    def flip_v():
        transform_service.flip_vertical()
        return jsonify({"message": "Отражено вертикально"})

    @bp.route("/transform/flip_both", methods=["POST"])
    def flip_both():
        transform_service.flip_horizontal()
        transform_service.flip_vertical()
        return jsonify({"message": "Отражено по обеим осям"})

    @bp.route("/transform/resize", methods=["POST"])
    def resize():
        data = request.json
        width = int(data["width"])
        height = int(data["height"])
        interpolation = data.get("interpolation", "bicubic")
        transform_service.resize(width, height, interpolation)
        return jsonify({"message": "Изменение размера выполнено"})

    @bp.route("/transform/crop", methods=["POST"])
    def crop():
        data = request.json
        x = int(data["x"])
        y = int(data["y"])
        w = int(data["w"])
        h = int(data["h"])
        transform_service.crop(x, y, w, h)
        return jsonify({"message": "Обрезка выполнена"})

    return bp
