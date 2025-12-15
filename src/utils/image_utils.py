# src/utils/image_utils.py
import base64
from io import BytesIO
import cairosvg
from PIL import Image


def trace_image_to_svg(image_path: str, threshold: int = 128, simplify: bool = True) -> str:
    """
    Простая трассировка (fallback) — возвращает SVG строку.
    (Для качественной трассировки используйте potrace на уровне сервера.)
    """
    try:
        img = Image.open(image_path).convert('L')
        width, height = img.size

        img_binary = img.point(lambda x: 255 if x > threshold else 0, '1')

        svg_parts = [
            f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">',
            f'<rect width="100%" height="100%" fill="white"/>'
        ]

        pixel_size = 2 if simplify else 1

        for y in range(0, height, pixel_size):
            row_start = -1
            for x in range(0, width, pixel_size):
                try:
                    pix = img_binary.getpixel((x, y))
                except Exception:
                    pix = 255
                if pix == 0:  # black pixel in binary
                    if row_start == -1:
                        row_start = x
                else:
                    if row_start != -1:
                        svg_parts.append(
                            f'<rect x="{row_start}" y="{y}" width="{x - row_start}" '
                            f'height="{pixel_size}" fill="black"/>'
                        )
                        row_start = -1
            if row_start != -1:
                svg_parts.append(
                    f'<rect x="{row_start}" y="{y}" width="{width - row_start}" '
                    f'height="{pixel_size}" fill="black"/>'
                )

        svg_parts.append('</svg>')
        return '\n'.join(svg_parts)
    except Exception as e:
        raise RuntimeError(f"Tracing failed: {str(e)}")


def rasterize_svg(svg_content: str, width: int = None, height: int = None,
                  format: str = 'PNG', dpi: int = 96, quality: int = 90) -> BytesIO:
    """
    Конвертирует SVG в байтовый поток (BytesIO) указанного формата.
    Формат: 'PNG', 'JPEG', 'WEBP', 'PDF'
    """
    try:
        output = BytesIO()
        fmt = format.upper()

        if fmt == 'PNG':
            if width and height:
                cairosvg.svg2png(bytestring=svg_content.encode('utf-8'),
                                 write_to=output,
                                 output_width=width,
                                 output_height=height,
                                 dpi=dpi)
            else:
                cairosvg.svg2png(bytestring=svg_content.encode('utf-8'),
                                 write_to=output,
                                 dpi=dpi)
            output.seek(0)
            return output

        # Для форматов, не поддерживаемых напрямую, рендерим в PNG, потом конвертируем через PIL
        png_buf = BytesIO()
        cairosvg.svg2png(bytestring=svg_content.encode('utf-8'),
                         write_to=png_buf,
                         output_width=width,
                         output_height=height,
                         dpi=dpi)
        png_buf.seek(0)
        img = Image.open(png_buf)

        if fmt in ('JPEG', 'JPG'):
            # Убираем альфа-канал
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            out_buf = BytesIO()
            img.save(out_buf, format='JPEG', quality=quality)
            out_buf.seek(0)
            return out_buf

        if fmt == 'WEBP':
            out_buf = BytesIO()
            img.save(out_buf, format='WEBP', quality=quality)
            out_buf.seek(0)
            return out_buf

        if fmt == 'PDF':
            out_buf = BytesIO()
            cairosvg.svg2pdf(bytestring=svg_content.encode('utf-8'), write_to=out_buf)
            out_buf.seek(0)
            return out_buf

        raise RuntimeError(f'Unsupported raster format: {format}')
    except Exception as e:
        raise RuntimeError(f'Rasterization failed: {e}')


def image_to_base64(image_path: str) -> str:
    try:
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        raise RuntimeError(f'Could not convert image to base64: {e}')
