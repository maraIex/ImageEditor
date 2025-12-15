import os
import base64
import cv2

from src.services.history_manager import HistoryManager
from src.utils.image_utils import decode_image, save_image
from src.utils.file_utils import copy_file


class ImageService:
    """
    Центральный сервис управления изображением.
    """

    def __init__(self, project):
        self.project = project
        self.history = HistoryManager(project)

    # ===================== ЗАГРУЗКА =====================

    def upload_image(self, file_bytes: bytes):
        """
        Загружает новое изображение.
        Сохраняет его как original и current.
        История очищается.
        """
        image = decode_image(file_bytes)

        save_image(self.project.original_path, image)
        save_image(self.project.current_path, image)

        self.history.clear()

    # ===================== ОТКАТ =====================

    def undo(self):
        """
        Откат к предыдущему состоянию.
        """
        self.history.undo()

    # ===================== RESET =====================

    def reset(self):
        """
        Возврат к оригинальному изображению.
        """
        if not self.project.has_original():
            raise ValueError("Нет оригинального изображения")

        copy_file(self.project.original_path, self.project.current_path)
        self.history.clear()

    # ===================== CLEAR =====================

    def clear(self):
        """
        Полная очистка холста и истории.
        """
        if self.project.has_current():
            os.remove(self.project.current_path)

        self.history.clear()

    # ===================== BASE64 =====================

    def get_current_base64(self):
        """
        Возвращает текущее изображение в base64 для canvas.
        """
        if not self.project.has_current():
            return None

        with open(self.project.current_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    # ===================== EXPORT =====================

    def export(self, fmt: str):
        """
        Экспорт изображения в нужный формат.
        """
        if not self.project.has_current():
            raise ValueError("Нет изображения для экспорта")

        img = cv2.imread(self.project.current_path)
        export_path = os.path.join(
            self.project.upload_dir,
            f"exported.{fmt.lower()}"
        )

        save_image(export_path, img)
        return export_path
