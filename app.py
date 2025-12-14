from flask import Flask, render_template, request, jsonify, send_file
import os
import cv2
from image_processing.loader import allowed_file, load_image
from image_processing.resize import resize_image
from image_processing.crop import crop_rectangle
from image_processing.transform import flip_image, rotate_image
from image_processing.color import adjust_brightness_contrast, adjust_color_balance
from image_processing.noise import gaussian_noise, salt_pepper_noise
from image_processing.blur import blur_image
from image_processing.saver import save_image
import uuid

from src.routes import canvas_routes, import_export_routes, project_routes, gradient_filter_routes, image_routes, \
    animation_routes

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
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

    save_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
    cv2.imwrite(save_path, img)

    return jsonify({
        "message": "Изображение успешно загружено",
        "image_url": f"/{save_path}"
    })


@app.route("/download/<filename>")
def download(filename):
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    if not os.path.exists(path):
        return jsonify({"error": "Файл не найден"}), 404
    return send_file(path, as_attachment=True)

@app.route("/resize", methods=["POST"])
def resize():
    try:
        width = request.json.get("width")
        height = request.json.get("height")
        scale = request.json.get("scale")

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/crop", methods=["POST"])
def crop():
    try:
        data = request.json

        x = int(data["x"])
        y = int(data["y"])
        w = int(data["width"])
        h = int(data["height"])

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/flip", methods=["POST"])
def flip():
    try:
        mode = request.json.get("mode")

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/rotate", methods=["POST"])
def rotate():
    try:
        data = request.json
        angle = float(data["angle"])

        center_x = data.get("center_x")
        center_y = data.get("center_y")

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/brightness_contrast", methods=["POST"])
def brightness_contrast():
    try:
        data = request.json
        brightness = int(data.get("brightness", 0))
        contrast = float(data.get("contrast", 1.0))

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/color_balance", methods=["POST"])
def color_balance():
    try:
        data = request.json

        r = int(data.get("r", 0))
        g = int(data.get("g", 0))
        b = int(data.get("b", 0))

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/noise", methods=["POST"])
def noise():
    try:
        data = request.json
        noise_type = data.get("type")

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/blur", methods=["POST"])
def blur():
    try:
        data = request.json
        blur_type = data.get("type")
        k = int(data.get("kernel", 5))

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
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

@app.route("/save", methods=["POST"])
def save():
    try:
        data = request.json
        format = data.get("format", "png")
        quality = int(data.get("quality", 95))

        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")
        img = cv2.imread(img_path)

        if img is None:
            return jsonify({"error": "Изображение не найдено"}), 400

        filename = f"result_{uuid.uuid4().hex}.{format}"
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

        success = save_image(img, save_path, format, quality)

        if not success:
            return jsonify({"error": "Ошибка сохранения файла"}), 500

        return jsonify({
            "message": "Изображение успешно сохранено",
            "download_url": f"/download/{filename}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/clear", methods=["POST"])
def clear():
    try:
        img_path = os.path.join(app.config["UPLOAD_FOLDER"], "current.png")

        if os.path.exists(img_path):
            os.remove(img_path)

        return jsonify({
            "message": "Редактор очищен"
        })

    except Exception as e:
        return jsonify({
            "error": f"Ошибка очистки: {str(e)}"
        }), 500


app.register_blueprint(canvas_routes.bp)
app.register_blueprint(import_export_routes.bp)
app.register_blueprint(project_routes.bp)
app.register_blueprint(gradient_filter_routes.bp)
app.register_blueprint(image_routes.bp)
app.register_blueprint(animation_routes.bp)

if __name__ == "__main__":
    app.run(debug=True)