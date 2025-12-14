import cv2

def choose_interpolation(scale_x, scale_y):
    scale = max(scale_x, scale_y)

    if scale > 2:
        return cv2.INTER_CUBIC
    elif scale < 1:
        return cv2.INTER_AREA
    else:
        return cv2.INTER_LINEAR


def resize_image(img, new_width=None, new_height=None, scale=None):
    h, w = img.shape[:2]

    if scale is not None:
        new_width = int(w * scale)
        new_height = int(h * scale)

    if new_width <= 0 or new_height <= 0:
        raise ValueError("Некорректные размеры изображения")

    scale_x = new_width / w
    scale_y = new_height / h

    interpolation = choose_interpolation(scale_x, scale_y)

    resized = cv2.resize(
        img,
        (new_width, new_height),
        interpolation=interpolation
    )

    return resized
