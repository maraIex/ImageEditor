import cv2
import os

def save_image(img, save_path, format, quality=95):
    format = format.lower()

    if format == "jpg" or format == "jpeg":
        return cv2.imwrite(
            save_path,
            img,
            [cv2.IMWRITE_JPEG_QUALITY, quality]
        )

    elif format == "png":
        return cv2.imwrite(save_path, img)

    elif format == "tiff":
        return cv2.imwrite(save_path, img)

    else:
        raise ValueError("Неподдерживаемый формат сохранения")
