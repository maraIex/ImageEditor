import cv2

def blur_image(img, blur_type, k=5):
    if k % 2 == 0:
        k += 1

    if blur_type == "average":
        return cv2.blur(img, (k, k))
    elif blur_type == "gaussian":
        return cv2.GaussianBlur(img, (k, k), 0)
    elif blur_type == "median":
        return cv2.medianBlur(img, k)
    else:
        raise ValueError("Неизвестный тип размытия")
