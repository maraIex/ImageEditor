import cv2

def adjust_brightness_contrast(img, brightness=0, contrast=1.0):
    return cv2.convertScaleAbs(
        img,
        alpha=contrast,
        beta=brightness
    )

def adjust_color_balance(img, r_shift=0, g_shift=0, b_shift=0):
    b, g, r = cv2.split(img)

    r = cv2.add(r, r_shift)
    g = cv2.add(g, g_shift)
    b = cv2.add(b, b_shift)

    return cv2.merge([b, g, r])