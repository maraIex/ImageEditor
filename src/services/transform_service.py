import cv2

from src.utils.image_utils import save_image


class TransformService:
    """
    Геометрические трансформации изображения.
    """

    def __init__(self, project, history):
        self.project = project
        self.history = history

    # ===================== ROTATE =====================

    def rotate(self, angle: float):
        if not self.project.has_current():
            raise ValueError("Нет изображения")

        self.history.push()

        img = cv2.imread(self.project.current_path)
        h, w = img.shape[:2]

        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)

        cos = abs(M[0, 0])
        sin = abs(M[0, 1])

        new_w = int(h * sin + w * cos)
        new_h = int(h * cos + w * sin)

        M[0, 2] += new_w / 2 - center[0]
        M[1, 2] += new_h / 2 - center[1]

        rotated = cv2.warpAffine(img, M, (new_w, new_h))
        save_image(self.project.current_path, rotated)

    # ===================== FLIP =====================

    def flip_horizontal(self):
        if not self.project.has_current():
            raise ValueError("Нет изображения")

        self.history.push()
        img = cv2.imread(self.project.current_path)
        flipped = cv2.flip(img, 1)
        save_image(self.project.current_path, flipped)

    def flip_vertical(self):
        if not self.project.has_current():
            raise ValueError("Нет изображения")

        self.history.push()
        img = cv2.imread(self.project.current_path)
        flipped = cv2.flip(img, 0)
        save_image(self.project.current_path, flipped)

    # ===================== RESIZE =====================

    def resize(self, width: int, height: int, interpolation: str):
        if not self.project.has_current():
            raise ValueError("Нет изображения")

        self.history.push()
        img = cv2.imread(self.project.current_path)

        interp_map = {
            "nearest": cv2.INTER_NEAREST,
            "bilinear": cv2.INTER_LINEAR,
            "bicubic": cv2.INTER_CUBIC
        }

        interp = interp_map.get(interpolation, cv2.INTER_CUBIC)

        resized = cv2.resize(img, (width, height), interpolation=interp)
        save_image(self.project.current_path, resized)

    # ===================== CROP =====================

    def crop(self, x: int, y: int, w: int, h: int):
        if not self.project.has_current():
            raise ValueError("Нет изображения")

        self.history.push()
        img = cv2.imread(self.project.current_path)

        cropped = img[y:y + h, x:x + w]
        if cropped.size == 0:
            raise ValueError("Неверные координаты обрезки")

        save_image(self.project.current_path, cropped)
