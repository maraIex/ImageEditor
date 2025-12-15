import cv2

from src.models.project_model import ProjectModel
from src.services.history_manager import HistoryManager
from src.utils.file_utils import ensure_directory
from src.utils.image_utils import save_image


class CanvasService:
    """
    Сервис изменения размера холста (canvas resize).
    """

    def __init__(self, project, history):
        self.project = project
        self.history = history

    def resize(self, width: int, height: int):
        """
        Изменяет физический размер изображения под canvas.
        """
        if not self.project.has_current():
            raise ValueError("Нет изображения")

        # сохраняем состояние ДО изменения
        self.history.push()

        image = cv2.imread(self.project.current_path)

        resized = cv2.resize(
            image,
            (int(width), int(height)),
            interpolation=cv2.INTER_CUBIC
        )

        save_image(self.project.current_path, resized)

UPLOAD_DIR = "uploads"

ensure_directory(UPLOAD_DIR)

# ===================== PROJECT & HISTORY =====================
project = ProjectModel(UPLOAD_DIR)
history = HistoryManager(project)

canvas_service = CanvasService(project, history)