import cv2
import numpy as np

from src.services.history_manager import HistoryManager
from src.utils.image_utils import save_image, decode_image
from src.utils.file_utils import copy_file, ensure_directory
from src.models.project_model import ProjectModel


class FilterService:
    """
    Применение фильтров к изображению.
    Все изменения записываются в историю.
    """

    def __init__(self, project, history):
        self.project = project
        self.history = history

    # ===================== ВНУТРЕННИЕ =====================

    def _backup(self):
        """
        Сохраняем текущее состояние в историю.
        """
        if self.project.has_current():
            self.history.push()

    def _load_original(self):
        """
        Загружаем оригинальное изображение.
        """
        if not self.project.has_original():
            raise ValueError("Нет оригинального изображения")
        return cv2.imread(self.project.original_path)

    # ===================== BRIGHTNESS / CONTRAST =====================

    def brightness_contrast(self, brightness: int, contrast: float):
        self._backup()
        img = self._load_original()
        result = cv2.convertScaleAbs(img, alpha=contrast, beta=brightness)
        save_image(self.project.current_path, result)

    # ===================== COLOR BALANCE =====================

    def color_balance(self, r: int, g: int, b: int):
        self._backup()
        img = self._load_original()
        b_ch, g_ch, r_ch = cv2.split(img)
        r_ch = cv2.add(r_ch, r)
        g_ch = cv2.add(g_ch, g)
        b_ch = cv2.add(b_ch, b)
        result = cv2.merge([b_ch, g_ch, r_ch])
        save_image(self.project.current_path, result)

    # ===================== GAUSSIAN NOISE =====================

    def add_gaussian_noise(self, sigma: float):
        self._backup()
        img = self._load_original()
        noise = np.random.normal(0, sigma, img.shape).astype(np.float32)
        noisy = cv2.add(img.astype(np.float32), noise)
        noisy = np.clip(noisy, 0, 255).astype(np.uint8)
        save_image(self.project.current_path, noisy)

    # ===================== BLUR =====================

    def blur(self, blur_type: str, ksize: int):
        self._backup()
        img = self._load_original()

        # корректируем ksize
        ksize = max(3, int(ksize))  # минимум 3
        if ksize % 2 == 0:
            ksize += 1  # делаем нечётным

        if blur_type == "average":
            result = cv2.blur(img, (ksize, ksize))
        elif blur_type == "gaussian":
            result = cv2.GaussianBlur(img, (ksize, ksize), 0)
        elif blur_type == "median":
            result = cv2.medianBlur(img, ksize)
        else:
            raise ValueError("Неизвестный тип размытия")

        save_image(self.project.current_path, result)

    # ===================== BRIGHTNESS + RGB =====================

    def brightness_contrast_rgb(self, brightness: int, contrast: float, r: int, g: int, b: int):
        self._backup()
        img = self._load_original()
        img_bc = cv2.convertScaleAbs(img, alpha=contrast, beta=brightness)

        b_ch, g_ch, r_ch = cv2.split(img_bc)
        r_ch = cv2.add(r_ch, r)
        g_ch = cv2.add(g_ch, g)
        b_ch = cv2.add(b_ch, b)

        result = cv2.merge([b_ch, g_ch, r_ch])
        save_image(self.project.current_path, result)

UPLOAD_DIR = "uploads"

ensure_directory(UPLOAD_DIR)

# ===================== PROJECT & HISTORY =====================
project = ProjectModel(UPLOAD_DIR)
history = HistoryManager(project)

filter_service = FilterService(project, history)