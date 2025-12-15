from flask import Blueprint, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import base64
import numpy as np
import cv2
import os

from image_tools import (
    read_uploaded_image,
    decode_base64_image,
    encode_image_base64,
    resize_image,
    crop_image,
    rotate_image,
    flip_image,
    brightness_contrast,
    color_balance,
    add_noise,
    blur_image
)

bp = Blueprint("main", __name__)

ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff'}
OUTPUT_DIR = "static/outputs"


@bp.route("/")
def index():
    return render_template("index.html")


@bp.route("/process", methods=["POST"])
def process():
    try:
        action = request.form.get("action")

        img = None
        if "image" in request.files and request.files["image"].filename:
            f = request.files["image"]
            ext = os.path.splitext(f.filename.lower())[1]
            if ext not in ALLOWED_EXT:
                return jsonify(error="Неподдерживаемый формат"), 400
            img = read_uploaded_image(f)

        elif request.form.get("image_b64"):
            img = decode_base64_image(request.form["image_b64"])
            if img is None:
                return jsonify(error="Ошибка декодирования base64"), 400
        else:
            return jsonify(error="Изображение не отправлено"), 400

        h, w = img.shape[:2]


        if action == "upload":
            return jsonify(
                result=encode_image_base64(img),
                info=f"Загружено: {w}×{h}"
            )

        if action == "resize":
            interp = request.form.get("interp", "INTER_LINEAR")
            tw = request.form.get("w")
            th = request.form.get("h")
            new_img = resize_image(img, tw, th, interp)
            return jsonify(result=encode_image_base64(new_img))

        if action == "crop":
            x = int(request.form.get("x"))
            y = int(request.form.get("y"))
            cw = int(request.form.get("w"))
            ch = int(request.form.get("h"))
            new_img = crop_image(img, x, y, cw, ch)
            return jsonify(result=encode_image_base64(new_img))

        if action == "rotate":
            angle = float(request.form.get("angle"))
            cx = request.form.get("cx")
            cy = request.form.get("cy")
            new_img = rotate_image(img, angle, cx, cy)
            return jsonify(result=encode_image_base64(new_img))

        if action == "flip":
            mode = request.form.get("mode", "h")
            new_img = flip_image(img, mode)
            return jsonify(result=encode_image_base64(new_img))

        if action == "bc":
            alpha = float(request.form.get("alpha"))
            beta = float(request.form.get("beta"))
            new_img = brightness_contrast(img, alpha, beta)
            return jsonify(result=encode_image_base64(new_img))

        if action == "color":
            r = float(request.form.get("r"))
            g = float(request.form.get("g"))
            b = float(request.form.get("b"))
            new_img = color_balance(img, r, g, b)
            return jsonify(result=encode_image_base64(new_img))

        if action == "noise":
            t = request.form.get("type")
            a = float(request.form.get("amount"))
            new_img = add_noise(img, t, a)
            return jsonify(result=encode_image_base64(new_img))

        if action == "blur":
            t = request.form.get("type")
            k = int(request.form.get("ksize"))
            new_img = blur_image(img, t, k)
            return jsonify(result=encode_image_base64(new_img))

        if action == "save":
            fmt = request.form.get("format", "jpg")
            name = secure_filename(request.form.get("name", "edited"))
            quality = int(request.form.get("quality", 90))

            out_path = f"{OUTPUT_DIR}/{name}.{fmt}"

            if fmt == "jpg":
                cv2.imwrite(out_path, img, [cv2.IMWRITE_JPEG_QUALITY, quality])
            else:
                cv2.imwrite(out_path, img)

            return jsonify(
                result=encode_image_base64(img),
                saved_path=f"/{out_path}",
                saved_name=f"{name}.{fmt}"
            )

        return jsonify(error="Неизвестное действие"), 400

    except Exception as e:
        return jsonify(error=str(e)), 500


@bp.route("/static/outputs/<filename>")
def download_file(filename):
    return send_from_directory(OUTPUT_DIR, filename)
