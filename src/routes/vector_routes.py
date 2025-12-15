from flask import Blueprint, request, jsonify, send_file, current_app
import os
import cv2
import uuid

# Импорты функций из image_processing (как было в исходном app.py)
from image_processing.loader import allowed_file, load_image
from image_processing.resize import resize_image
from image_processing.crop import crop_rectangle
from image_processing.transform import flip_image, rotate_image
from image_processing.color import adjust_brightness_contrast, adjust_color_balance
from image_processing.noise import gaussian_noise, salt_pepper_noise
from image_processing.blur import blur_image
from image_processing.saver import save_image

bp = Blueprint('vector', __name__, url_prefix='/api/vector')  # пустой префикс — пути остаются как раньше

# Helpers to read folders from app config
def _get_upload_folder():
    return current_app.config.get("UPLOAD_FOLDER", "uploads")

def _get_projects_folder():
    return current_app.config.get("PROJECTS_FOLDER", "projects")


@bp.route("/upload", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "Файл не найден"}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "Файл не выбран"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Неподдерживаемый формат файла"}), 400

    try:
        img = load_image(file.read())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    upload_folder = _get_upload_folder()
    os.makedirs(upload_folder, exist_ok=True)
    save_path = os.path.join(upload_folder, "current.png")
    cv2.imwrite(save_path, img)

    return jsonify({
        "message": "Изображение успешно загружено",
        "image_url": f"/{save_path}"
    })


@bp.route("/download/<filename>")
def download(filename):
    upload_folder = _get_upload_folder()
    path = os.path.join(upload_folder, filename)
    if not os.path.exists(path):
        return jsonify({"error": "Файл не найден"}), 404
    return send_file(path, as_attachment=True)


@bp.route("/resize", methods=["POST"])
def resize():
    try:
        width = request.json.get("width")
        height = request.json.get("height")
        scale = request.json.get("scale")

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        resized = resize_image(
            img,
            new_width=width,
            new_height=height,
            scale=scale
        )

        cv2.imwrite(img_path, resized)

        return jsonify({
            "message": "Размер изображения изменён",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/crop", methods=["POST"])
def crop():
    try:
        data = request.json

        x = int(data["x"])
        y = int(data["y"])
        w = int(data["width"])
        h = int(data["height"])

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        cropped = crop_rectangle(img, x, y, w, h)
        cv2.imwrite(img_path, cropped)

        return jsonify({
            "message": "Фрагмент успешно вырезан",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/flip", methods=["POST"])
def flip():
    try:
        mode = request.json.get("mode")

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        flipped = flip_image(img, mode)
        cv2.imwrite(img_path, flipped)

        return jsonify({
            "message": "Изображение отражено",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/rotate", methods=["POST"])
def rotate():
    try:
        data = request.json
        angle = float(data["angle"])

        center_x = data.get("center_x")
        center_y = data.get("center_y")

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        center = None
        if center_x is not None and center_y is not None:
            center = (int(center_x), int(center_y))

        rotated = rotate_image(img, angle, center)
        cv2.imwrite(img_path, rotated)

        return jsonify({
            "message": "Изображение повернуто",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/brightness_contrast", methods=["POST"])
def brightness_contrast():
    try:
        data = request.json
        brightness = int(data.get("brightness", 0))
        contrast = float(data.get("contrast", 1.0))

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        result = adjust_brightness_contrast(img, brightness, contrast)
        cv2.imwrite(img_path, result)

        return jsonify({
            "message": "Яркость и контраст изменены",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/color_balance", methods=["POST"])
def color_balance():
    try:
        data = request.json

        r = int(data.get("r", 0))
        g = int(data.get("g", 0))
        b = int(data.get("b", 0))

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        result = adjust_color_balance(img, r, g, b)
        cv2.imwrite(img_path, result)

        return jsonify({
            "message": "Цветовой баланс изменён",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/noise", methods=["POST"])
def noise():
    try:
        data = request.json
        noise_type = data.get("type")

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        if noise_type == "gaussian":
            sigma = int(data.get("sigma", 20))
            result = gaussian_noise(img, sigma)
        elif noise_type == "sp":
            amount = float(data.get("amount", 0.01))
            result = salt_pepper_noise(img, amount)
        else:
            return jsonify({"error": "Неизвестный тип шума"}), 400

        cv2.imwrite(img_path, result)

        return jsonify({
            "message": "Шум добавлен",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/blur", methods=["POST"])
def blur():
    try:
        data = request.json
        blur_type = data.get("type")
        k = int(data.get("kernel", 5))

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не загружено"}), 400

        result = blur_image(img, blur_type, k)
        cv2.imwrite(img_path, result)

        return jsonify({
            "message": "Размытие применено",
            "image_url": f"/{img_path}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/save", methods=["POST"])
def save():
    try:
        data = request.json
        fmt = data.get("format", "png")
        quality = int(data.get("quality", 95))

        img_path = os.path.join(_get_upload_folder(), "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не найдено"}), 400

        filename = f"result_{uuid.uuid4().hex}.{fmt}"
        save_path = os.path.join(_get_upload_folder(), filename)

        success = save_image(img, save_path, fmt, quality)

        if not success:
            return jsonify({"error": "Ошибка сохранения файла"}), 500

        return jsonify({
            "message": "Изображение успешно сохранено",
            "download_url": f"/download/{filename}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/clear", methods=["POST"])
def clear():
    try:
        img_path = os.path.join(_get_upload_folder(), "current.png")

        if os.path.exists(img_path):
            os.remove(img_path)

        return jsonify({
            "message": "Редактор очищен"
        })

    except Exception as e:
        return jsonify({
            "error": f"Ошибка очистки: {str(e)}"
        }), 500
