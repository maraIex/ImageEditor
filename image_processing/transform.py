import cv2
import numpy as np

def flip_image(img, mode):
    if mode == "horizontal":
        return cv2.flip(img, 1)
    elif mode == "vertical":
        return cv2.flip(img, 0)
    elif mode == "both":
        return cv2.flip(img, -1)
    else:
        raise ValueError("Неверный режим отражения")

def rotate_image(img, angle, center=None):
    h, w = img.shape[:2]

    if center is None:
        center = (w // 2, h // 2)

    M = cv2.getRotationMatrix2D(center, angle, 1.0)

    rotated = cv2.warpAffine(
        img,
        M,
        (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT
    )

    return rotated