def crop_rectangle(img, x, y, w, h):
    height, width = img.shape[:2]

    if x < 0 or y < 0 or x + w > width or y + h > height:
        raise ValueError("Координаты вырезки выходят за пределы изображения")

    return img[y:y+h, x:x+w]
