import cv2
import os
import base64

from src.models.project_model import ProjectModel
from src.utils.image_utils import save_image, decode_image
from src.utils.file_utils import copy_file, ensure_directory
from src.services.history_manager import HistoryManager

class ImageService:
    def __init__(self, project):
        self.project = project
        self.history = HistoryManager(project)

    def upload_image(self, file_bytes: bytes):
        image = decode_image(file_bytes)
        save_image(self.project.original_path, image)
        save_image(self.project.current_path, image)
        self.history.clear()

    def undo(self):
        self.history.undo()

    def reset(self):
        copy_file(self.project.original_path, self.project.current_path)
        self.history.clear()

    def get_current_base64(self):
        if not os.path.exists(self.project.current_path):
            return None
        with open(self.project.current_path, "rb") as f:
            return base64.b64encode(f.read()).decode()

    # ===================== ЭКСПОРТ В РАЗНЫЕ ФОРМАТЫ =====================
    def export(self, fmt: str):
        img = cv2.imread(self.project.current_path)
        fmt = fmt.lower()
        if fmt not in ["png", "jpg", "jpeg", "tiff", "tif"]:
            fmt = "png"  # формат по умолчанию

        # корректное расширение
        ext_map = {"jpeg": "jpg", "tif": "tiff"}
        ext = ext_map.get(fmt, fmt)

        path = self.project.current_path.rsplit(".", 1)[0] + f".{ext}"

        # параметры сохранения для JPG
        if ext in ["jpg", "jpeg"]:
            cv2.imwrite(path, img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        else:
            cv2.imwrite(path, img)

        return path

UPLOAD_DIR = "uploads"

ensure_directory(UPLOAD_DIR)

# ===================== PROJECT & HISTORY =====================
project = ProjectModel(UPLOAD_DIR)
history = HistoryManager(project)

# ===================== SERVICES =====================
image_service = ImageService(project)
