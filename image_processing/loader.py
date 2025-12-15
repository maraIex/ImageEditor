import cv2
import numpy as np

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "tiff", "bmp"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def load_image(file_bytes):
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Невозможно прочитать изображение")
    return img