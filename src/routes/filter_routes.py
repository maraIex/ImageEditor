from flask import Blueprint, request, jsonify

from src.services.filter_service import filter_service

bp = Blueprint("filter_routes", __name__)

@bp.route("/filter/brightness_contrast", methods=["POST"])
def bc():
    d = request.json
    filter_service.brightness_contrast(int(d["brightness"]), float(d["contrast"]))
    return jsonify({"message": "Яркость/контраст применены"})

@bp.route("/filter/color_balance", methods=["POST"])
def color_balance():
    d = request.json
    filter_service.color_balance(int(d["r"]), int(d["g"]), int(d["b"]))
    return jsonify({"message": "Баланс цвета применен"})

@bp.route("/filter/add_gaussian_noise", methods=["POST"])
def add_noise():
    sigma = float(request.json["sigma"])
    filter_service.add_gaussian_noise(sigma)
    return jsonify({"message": "Шум добавлен"})

@bp.route("/filter/blur", methods=["POST"])
def blur():
    d = request.json
    filter_service.blur(d["type"], int(d["ksize"]))
    return jsonify({"message": "Размытие применено"})

@bp.route("/filter/brightness_contrast_rgb", methods=["POST"])
def bc_rgb():
    d = request.json
    filter_service.brightness_contrast_rgb(
        int(d["brightness"]),
        float(d["contrast"]),
        int(d["r"]),
        int(d["g"]),
        int(d["b"])
    )
    return jsonify({"message": "Фильтры применены"})
