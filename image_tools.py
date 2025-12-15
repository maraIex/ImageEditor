import cv2
import numpy as np
import base64


def read_uploaded_image(file):
    data = file.read()
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)

    if img is None:
        raise ValueError("Ошибка загрузки изображения")

    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

    return img


def decode_base64_image(data_url):
    header, encoded = data_url.split(",", 1)
    arr = np.frombuffer(base64.b64decode(encoded), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def encode_image_base64(img, fmt="png"):
    ret, buf = cv2.imencode(f".{fmt}", img)
    b64 = base64.b64encode(buf).decode("utf-8")
    return f"data:image/{fmt};base64,{b64}"

def resize_image(img, w, h, interp):
    h0, w0 = img.shape[:2]

    interp_map = {
        "INTER_NEAREST": cv2.INTER_NEAREST,
        "INTER_LINEAR": cv2.INTER_LINEAR,
        "INTER_CUBIC": cv2.INTER_CUBIC
    }
    inter = interp_map.get(interp, cv2.INTER_LINEAR)

    if w and h:
        w, h = int(w), int(h)
    elif w:
        w = int(w)
        h = int(h0 * w / w0)
    elif h:
        h = int(h)
        w = int(w0 * h / h0)

    return cv2.resize(img, (w, h), interpolation=inter)


def crop_image(img, x, y, w, h):
    return img[y:y+h, x:x+w]


def rotate_image(img, angle, cx, cy):
    h, w = img.shape[:2]
    if not cx or not cy:
        cx, cy = w/2, h/2
    else:
        cx, cy = float(cx), float(cy)

    M = cv2.getRotationMatrix2D((cx, cy), -angle, 1.0)
    cos, sin = abs(M[0, 0]), abs(M[0, 1])

    nW = int((h * sin) + (w * cos))
    nH = int((h * cos) + (w * sin))

    M[0, 2] += (nW / 2) - cx
    M[1, 2] += (nH / 2) - cy

    return cv2.warpAffine(img, M, (nW, nH), flags=cv2.INTER_LINEAR)


def flip_image(img, mode):
    if mode == "h":
        return cv2.flip(img, 1)
    if mode == "v":
        return cv2.flip(img, 0)
    return cv2.flip(img, -1)


def brightness_contrast(img, alpha, beta):
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)


def color_balance(img, r, g, b):
    out = img.astype(np.float32)
    out[:, :, 2] *= r
    out[:, :, 1] *= g
    out[:, :, 0] *= b
    return np.clip(out, 0, 255).astype(np.uint8)


def add_noise(img, noise_type, amount):
    if noise_type == "gaussian":
        mean = 0
        sigma = amount * 255
        gauss = np.random.normal(mean, sigma, img.shape).astype(np.float32)
        out = img.astype(np.float32) + gauss
        return np.clip(out, 0, 255).astype(np.uint8)

    # Salt & pepper
    out = img.copy()
    s_vs_p = 0.5

    num_salt = int(amount * img.size * s_vs_p)
    coords = [np.random.randint(0, i - 1, num_salt) for i in img.shape[:2]]
    out[coords[0], coords[1]] = 255

    num_pepper = int(amount * img.size * (1 - s_vs_p))
    coords = [np.random.randint(0, i - 1, num_pepper) for i in img.shape[:2]]
    out[coords[0], coords[1]] = 0

    return out


def blur_image(img, type_, k):
    if k % 2 == 0:
        k += 1

    if type_ == "average":
        return cv2.blur(img, (k, k))
    if type_ == "gaussian":
        return cv2.GaussianBlur(img, (k, k), 0)
    return cv2.medianBlur(img, k)
