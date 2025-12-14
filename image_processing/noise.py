import numpy as np
import cv2

def gaussian_noise(img, sigma=20):
    noise = np.random.normal(0, sigma, img.shape)
    noisy = img.astype(np.float32) + noise
    return np.clip(noisy, 0, 255).astype(np.uint8)


def salt_pepper_noise(img, amount=0.01):
    noisy = img.copy()
    h, w = img.shape[:2]
    num = int(amount * h * w)

    for _ in range(num):
        y = np.random.randint(0, h)
        x = np.random.randint(0, w)
        noisy[y, x] = 255 if np.random.rand() > 0.5 else 0

    return noisy
