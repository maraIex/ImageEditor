# src/utils/file_utils.py
import json
import os
from datetime import datetime
from typing import Optional

from ..models.project_model import Project


def save_project_file(project: Project, folder: str) -> str:
    """
    Сохраняет проект в папке folder. Возвращает имя файла (basename).
    Создаёт папку при необходимости.
    """
    os.makedirs(folder, exist_ok=True)
    filename = f"{project.id}.vdraw"
    filepath = os.path.join(folder, filename)

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(project.to_dict(), f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise IOError(f"Could not save project file: {e}")

    return filename


def load_project_file(filename: str, folder: str) -> Optional[Project]:
    """
    Загружает проект и возвращает Project instance или None.
    """
    filepath = os.path.join(folder, filename)
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return Project.from_dict(data)
    except Exception:
        return None


def get_file_info(filepath: str) -> dict:
    if not os.path.exists(filepath):
        return None
    stat = os.stat(filepath)
    return {
        'filename': os.path.basename(filepath),
        'size': stat.st_size,
        'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
        'path': filepath
    }


def cleanup_old_files(folder: str, max_age_hours: int = 24):
    current_time = datetime.now().timestamp()
    if not os.path.isdir(folder):
        return
    for filename in os.listdir(folder):
        if filename.startswith('temp_') or filename.endswith('.tmp'):
            filepath = os.path.join(folder, filename)
            try:
                file_age = current_time - os.path.getmtime(filepath)
                if file_age > max_age_hours * 3600:
                    os.remove(filepath)
            except Exception:
                # не ломаем цикл при ошибках удаления
                continue
