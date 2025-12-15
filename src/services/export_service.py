"""
Сервис экспорта SVG в различные форматы
"""
import cairosvg
from PIL import Image
from io import BytesIO


class ExportService:
    """
    Сервис экспорта SVG в различные форматы.
    """

    @staticmethod
    def export_to_format(svg_content: str, export_format: str = 'png',
                         width: int = None, height: int = None,
                         quality: int = 90) -> BytesIO:
        """
        Экспорт SVG в указанный формат.

        :param svg_content: строка SVG
        :param export_format: svg | png | jpg | jpeg | webp | pdf
        :param width: ширина в пикселях (для растровых форматов)
        :param height: высота в пикселях (для растровых форматов)
        :param quality: качество (для JPEG, WebP)
        :return: BytesIO объект
        """
        fmt = export_format.lower()

        if fmt == 'svg':
            output = BytesIO()
            output.write(svg_content.encode('utf-8'))
            output.seek(0)
            return output

        try:
            if fmt == 'png':
                output = BytesIO()
                if width and height:
                    cairosvg.svg2png(bytestring=svg_content.encode('utf-8'),
                                     write_to=output,
                                     output_width=width,
                                     output_height=height)
                else:
                    cairosvg.svg2png(bytestring=svg_content.encode('utf-8'),
                                     write_to=output)
                output.seek(0)
                return output

            elif fmt in ('jpg', 'jpeg'):
                # Сначала рендерим в PNG
                png_bytes = cairosvg.svg2png(bytestring=svg_content.encode('utf-8'))
                image = Image.open(BytesIO(png_bytes)).convert('RGB')

                output = BytesIO()
                image.save(output, format='JPEG', quality=quality)
                output.seek(0)
                return output

            elif fmt == 'webp':
                png_bytes = cairosvg.svg2png(bytestring=svg_content.encode('utf-8'))
                image = Image.open(BytesIO(png_bytes)).convert('RGB')

                output = BytesIO()
                image.save(output, format='WEBP', quality=quality)
                output.seek(0)
                return output

            elif fmt == 'pdf':
                output = BytesIO()
                cairosvg.svg2pdf(bytestring=svg_content.encode('utf-8'),
                                 write_to=output)
                output.seek(0)
                return output

            else:
                raise ValueError(f'Неподдерживаемый формат: {export_format}')

        except Exception as e:
            raise RuntimeError(f'Ошибка экспорта: {str(e)}')

    @staticmethod
    def get_format_info(format_type: str = None) -> dict:
        """Получение информации о форматах экспорта"""
        formats = {
            'svg': {
                'name': 'SVG (векторный)',
                'description': 'Векторный формат, редактируемый',
                'mime_type': 'image/svg+xml',
                'extensions': ['.svg']
            },
            'png': {
                'name': 'PNG (растровый)',
                'description': 'Растровый формат с поддержкой прозрачности',
                'mime_type': 'image/png',
                'extensions': ['.png']
            },
            'jpg': {
                'name': 'JPEG (растровый)',
                'description': 'Сжатый растровый формат',
                'mime_type': 'image/jpeg',
                'extensions': ['.jpg', '.jpeg']
            },
            'webp': {
                'name': 'WebP (растровый)',
                'description': 'Современный сжатый формат',
                'mime_type': 'image/webp',
                'extensions': ['.webp']
            },
            'pdf': {
                'name': 'PDF',
                'description': 'Формат документов',
                'mime_type': 'application/pdf',
                'extensions': ['.pdf']
            }
        }

        if format_type:
            return formats.get(format_type.lower(), {})
        return formats