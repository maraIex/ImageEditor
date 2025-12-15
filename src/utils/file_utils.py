import os
import shutil


def ensure_directory(path: str):
    os.makedirs(path, exist_ok=True)


def copy_file(src: str, dst: str):
    shutil.copy(src, dst)


def clear_directory(path: str):
    if not os.path.exists(path):
        return
    for f in os.listdir(path):
        os.remove(os.path.join(path, f))
