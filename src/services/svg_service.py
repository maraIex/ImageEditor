# src/services/svg_service.py
from typing import Dict, List, Tuple
import xml.etree.ElementTree as ET
import re
from ..utils.svg_utils import create_svg_template, extract_svg_layers, validate_svg, get_svg_size


class SVGService:
    @staticmethod
    def create_new_canvas(width: int = 800, height: int = 600, units: str = 'px') -> Dict:
        """
        Создание нового холста SVG.
        """
        svg_content = create_svg_template(width, height, units)
        layers = extract_svg_layers(svg_content)

        return {
            'svg': svg_content,
            'canvas': {
                'width': width,
                'height': height,
                'units': units
            },
            'layers': layers
        }

    @staticmethod
    def import_svg(svg_content: str) -> Tuple[str, List[str]]:
        """
        Импорт SVG с валидацией и очисткой.
        Возвращает очищенный SVG и список предупреждений.
        """
        cleaned_svg, warnings = validate_svg(svg_content)
        return cleaned_svg, warnings

    @staticmethod
    def analyze_svg_structure(svg_content: str) -> Dict:
        """
        Анализ структуры SVG.
        """
        try:
            # Регистрируем пространства имен
            ET.register_namespace('svg', 'http://www.w3.org/2000/svg')
            ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
            ET.register_namespace('inkscape', 'http://www.inkscape.org/namespaces/inkscape')
            ET.register_namespace('sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd')

            root = ET.fromstring(svg_content.encode('utf-8'))

            # Функция для подсчета элементов с учетом пространств имен
            def count_elements(tag):
                return len(root.findall(f'.//{{http://www.w3.org/2000/svg}}{tag}'))

            # Базовые элементы
            elements_count = len(list(root.iter()))
            groups_count = count_elements('g')
            paths_count = count_elements('path')
            images_count = count_elements('image')
            text_count = count_elements('text')
            rect_count = count_elements('rect')
            circle_count = count_elements('circle')
            ellipse_count = count_elements('ellipse')
            line_count = count_elements('line')
            polyline_count = count_elements('polyline')
            polygon_count = count_elements('polygon')

            # Градиенты
            linear_gradients = count_elements('linearGradient')
            radial_gradients = count_elements('radialGradient')

            # Фильтры
            filters_count = count_elements('filter')

            # Эффекты
            has_blur = len(root.findall('.//{http://www.w3.org/2000/svg}feGaussianBlur')) > 0
            has_shadow = len(root.findall('.//{http://www.w3.org/2000/svg}feDropShadow')) > 0

            # Получаем информацию о размерах
            size_info = get_svg_size(svg_content)

            return {
                'elements': elements_count,
                'groups': groups_count,
                'paths': paths_count,
                'images': images_count,
                'text': text_count,
                'rectangles': rect_count,
                'circles': circle_count,
                'ellipses': ellipse_count,
                'lines': line_count,
                'polylines': polyline_count,
                'polygons': polygon_count,
                'linear_gradients': linear_gradients,
                'radial_gradients': radial_gradients,
                'filters': filters_count,
                'has_blur': has_blur,
                'has_shadow': has_shadow,
                'size': size_info,
                'layers': groups_count  # Предполагаем, что группы = слои
            }
        except Exception as e:
            return {
                'error': str(e),
                'elements': 0,
                'size': {
                    'width': 800,
                    'height': 600,
                    'units': 'px'
                }
            }

    @staticmethod
    def normalize_svg(svg_content: str) -> str:
        """
        Нормализация SVG (удаление лишних пробелов, переносов).
        """
        # Удаляем лишние пробелы и переносы, но сохраняем структуру
        lines = svg_content.split('\n')
        cleaned_lines = []

        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)

        return '\n'.join(cleaned_lines)

    @staticmethod
    def extract_embedded_images(svg_content: str) -> List[Dict]:
        """
        Извлечение информации о встроенных изображениях.
        """
        images = []
        try:
            # Ищем теги image с data URI
            image_pattern = r'<image[^>]+href="data:image/([^;]+);base64,([^"]+)"[^>]*>'
            matches = re.findall(image_pattern, svg_content, re.IGNORECASE)

            for format, data in matches:
                images.append({
                    'format': format.lower(),
                    'size': len(data) * 3 / 4,  # Примерный размер в байтах
                    'data_url': f"data:image/{format};base64,{data[:50]}..."
                })

            # Ищем внешние изображения
            external_pattern = r'<image[^>]+(?:xlink:)?href="([^"]+)"[^>]*>'
            external_matches = re.findall(external_pattern, svg_content, re.IGNORECASE)

            for url in external_matches:
                if not url.startswith('data:'):
                    images.append({
                        'type': 'external',
                        'url': url,
                        'warning': 'Внешнее изображение'
                    })

            return images
        except:
            return []