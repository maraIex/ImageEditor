import base64
from typing import Dict, Tuple

from PIL import Image

from ..utils.image_utils import trace_image_to_svg


class ImportService:
    @staticmethod
    def process_uploaded_image(file_content: bytes, filename: str,
                               trace: bool = False, threshold: int = 128) -> Tuple[str, Dict]:
        #Обработка загруженного изображения.
        # В реальном проекте здесь нужно сохранять файл временно
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name

        try:
            if trace:
                # Трассировка в вектор
                svg_content = trace_image_to_svg(tmp_path, threshold)
                info = {'type': 'traced_vector', 'original_format': filename.split('.')[-1]}
            else:
                # Получим реальные размеры изображения
                try:
                    with Image.open(tmp_path) as im:
                        w, h = im.size
                        mime_type = Image.MIME.get(im.format, f"image/{os.path.splitext(filename)[1].lstrip('.')}")
                except Exception:
                    w, h = (None, None)
                    mime_type = f"image/{filename.split('.')[-1].lower()}"

                with open(tmp_path, 'rb') as f:
                    base64_data = base64.b64encode(f.read()).decode('utf-8')

                # Используем xlink:href для совместимости и указываем реальные размеры (если известны)
                href_attr = f'xlink:href="data:{mime_type};base64,{base64_data}"'
                size_attrs = f'width="{w}" height="{h}"' if w and h else 'width="100%" height="100%"'
                svg_content = f'<image xmlns:xlink="http://www.w3.org/1999/xlink" {href_attr} {size_attrs} preserveAspectRatio="xMidYMid meet"/>'
                info = {'type': 'raster_image', 'format': filename.split('.')[-1], 'size': os.path.getsize(tmp_path)}

            return svg_content, info

        finally:
            # Удаляем временный файл
            try:
                os.unlink(tmp_path)
            except:
                pass