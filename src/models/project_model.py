import os


class ProjectModel:
    """
    Хранит все пути и параметры проекта редактирования изображения.
    """

    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir

        # основные файлы
        self.original_path = os.path.join(upload_dir, "original.png")
        self.current_path = os.path.join(upload_dir, "current.png")

        # история
        self.history_dir = os.path.join(upload_dir, "history")
        self.max_history = 10

        # гарантируем наличие директорий
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.history_dir, exist_ok=True)

    # ===================== ПРОВЕРКИ СОСТОЯНИЯ =====================

    def has_original(self) -> bool:
        return os.path.exists(self.original_path)

    def has_current(self) -> bool:
        return os.path.exists(self.current_path)

    # ===================== УТИЛИТЫ =====================

    def clear_history(self):
        if not os.path.exists(self.history_dir):
            return
        for f in os.listdir(self.history_dir):
            path = os.path.join(self.history_dir, f)
            if os.path.isfile(path):
                os.remove(path)
