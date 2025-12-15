import cv2
import numpy as np


def decode_image(file_bytes: bytes):
    image = cv2.imdecode(
        np.frombuffer(file_bytes, np.uint8),
        cv2.IMREAD_COLOR
    )
    if image is None:
        raise ValueError("Ошибка декодирования изображения")
    return image


def save_image(path: str, image):
    if not cv2.imwrite(path, image):
        raise IOError(f"Не удалось сохранить изображение: {path}")
