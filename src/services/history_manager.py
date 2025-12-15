import os
from src.utils.file_utils import ensure_directory, copy_file


class HistoryManager:
    """
    Управляет историей изменений изображения.
    Сохраняет СОСТОЯНИЕ ДО каждого изменения.
    """

    def __init__(self, project):
        self.project = project
        ensure_directory(self.project.history_dir)

    # ===================== СОХРАНЕНИЕ СОСТОЯНИЯ =====================

    def push(self):
        """
        Сохраняет текущее изображение в историю.
        Вызывается ПЕРЕД любым изменением.
        """
        if not self.project.has_current():
            return

        files = sorted(
            os.listdir(self.project.history_dir),
            key=lambda x: int(x.split("_")[1].split(".")[0])
        )

        # ограничение истории
        if len(files) >= self.project.max_history:
            oldest = files[0]
            os.remove(os.path.join(self.project.history_dir, oldest))
            files.pop(0)

        index = len(files)
        dst = os.path.join(self.project.history_dir, f"step_{index}.png")
        copy_file(self.project.current_path, dst)

    # ===================== ОТКАТ =====================

    def undo(self):
        """
        Откатывает к последнему сохранённому состоянию.
        """
        files = sorted(
            os.listdir(self.project.history_dir),
            key=lambda x: int(x.split("_")[1].split(".")[0])
        )

        if not files:
            raise ValueError("История пуста")

        last = files[-1]
        src = os.path.join(self.project.history_dir, last)

        copy_file(src, self.project.current_path)
        os.remove(src)
