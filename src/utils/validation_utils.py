import os
from typing import Tuple

ALLOWED_SVG_EXTENSIONS = {'svg'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff'}
ALLOWED_PROJECT_EXTENSIONS = {'vdraw'}


def validate_filename(filename: str, allowed_extensions: set) -> Tuple[bool, str]:
    #Проверка имени файла на допустимое расширение.
    if not '.' in filename:
        return False, f"Файл должен иметь расширение"

    extension = filename.rsplit('.', 1)[1].lower()
    if extension not in allowed_extensions:
        return False, f"Недопустимый формат файла. Допустимые: {', '.join(allowed_extensions)}"

    return True, ""


def validate_file_size(file_size: int, max_size_mb: int = 50) -> Tuple[bool, str]:
    #Проверка размера файла.
    max_size_bytes = max_size_mb * 1024 * 1024
    if file_size > max_size_bytes:
        return False, f"Размер файла превышает {max_size_mb}MB"

    return True, ""


def sanitize_filename(filename: str) -> str:
    #Очистка имени файла от потенциально опасных символов.
    # Удаляем небезопасные символы
    unsafe_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    for char in unsafe_chars:
        filename = filename.replace(char, '_')

    # Ограничиваем длину
    if len(filename) > 100:
        name, ext = os.path.splitext(filename)
        filename = name[:95] + ext

    return filename