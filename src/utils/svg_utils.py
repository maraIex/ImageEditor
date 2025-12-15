# utils/svg_utils.py
import re
import json
import base64
from xml.dom import minidom


class SVGUtils:
    @staticmethod
    def parse_svg_string(svg_string):
        """Парсинг SVG строки в DOM"""
        try:
            dom = minidom.parseString(svg_string)
            return dom
        except Exception as e:
            print(f"Ошибка парсинга SVG: {e}")
            return None

    @staticmethod
    def extract_layers(svg_string):
        """Извлечение слоев из SVG"""
        dom = SVGUtils.parse_svg_string(svg_string)
        if not dom:
            return []

        layers = []
        groups = dom.getElementsByTagName('g')

        for i, group in enumerate(groups):
            layer_id = group.getAttribute('id') or f"layer_{i}"
            layers.append({
                'id': layer_id,
                'name': layer_id,
                'visible': group.getAttribute('display') != 'none',
                'locked': False,
                'content': group.toxml()
            })

        return layers

    @staticmethod
    def validate_svg(svg_string):
        """Валидация SVG"""
        if not svg_string:
            return False
        # Проверяем базовую структуру SVG
        return 'svg' in svg_string.lower() and 'xmlns' in svg_string

    @staticmethod
    def convert_to_base64(svg_string):
        """Конвертация SVG в base64"""
        encoded = base64.b64encode(svg_string.encode('utf-8')).decode('utf-8')
        return f"data:image/svg+xml;base64,{encoded}"

    @staticmethod
    def merge_svgs(svg_list):
        """Объединение нескольких SVG"""
        if not svg_list:
            return ""

        first_svg = svg_list[0]
        root_pattern = r'<svg[^>]*>'
        end_pattern = r'</svg>'

        # Извлекаем содержимое первого SVG
        match = re.search(root_pattern, first_svg)
        if not match:
            return ""

        root_tag = match.group()
        content = ""

        for svg in svg_list:
            # Убираем теги SVG
            content += re.sub(r'<\/?svg[^>]*>', '', svg)

        return f"{root_tag}{content}</svg>"