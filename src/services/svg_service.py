# services/svg_service.py
import svgwrite
import xml.etree.ElementTree as ET
from io import BytesIO
import base64
import tempfile
import os


class SVGService:
    @staticmethod
    def create_canvas(width, height, unit="px"):
        """Создание нового SVG холста"""
        if unit == "mm":
            # Конвертация мм в пиксели (1mm = 3.7795275591px)
            width = float(width) * 3.7795275591
            height = float(height) * 3.7795275591

        dwg = svgwrite.Drawing(size=(f"{width}px", f"{height}px"))
        dwg.viewbox(width=width, height=height)
        return dwg

    @staticmethod
    def add_rectangle(dwg, x, y, width, height, **style):
        """Добавление прямоугольника"""
        rect = dwg.rect(insert=(x, y), size=(width, height), **style)
        dwg.add(rect)
        return rect

    @staticmethod
    def add_circle(dwg, center_x, center_y, radius, **style):
        """Добавление круга"""
        circle = dwg.circle(center=(center_x, center_y), r=radius, **style)
        dwg.add(circle)
        return circle

    @staticmethod
    def add_ellipse(dwg, center_x, center_y, rx, ry, **style):
        """Добавление эллипса"""
        ellipse = dwg.ellipse(center=(center_x, center_y), r=(rx, ry), **style)
        dwg.add(ellipse)
        return ellipse

    @staticmethod
    def add_line(dwg, x1, y1, x2, y2, **style):
        """Добавление линии"""
        line = dwg.line(start=(x1, y1), end=(x2, y2), **style)
        dwg.add(line)
        return line

    @staticmethod
    def add_polyline(dwg, points, **style):
        """Добавление ломаной линии"""
        polyline = dwg.polyline(points=points, **style)
        dwg.add(polyline)
        return polyline

    @staticmethod
    def add_polygon(dwg, points, **style):
        """Добавление многоугольника"""
        polygon = dwg.polygon(points=points, **style)
        dwg.add(polygon)
        return polygon

    @staticmethod
    def add_text(dwg, text, x, y, **style):
        """Добавление текста"""
        text_elem = dwg.text(text, insert=(x, y), **style)
        dwg.add(text_elem)
        return text_elem

    @staticmethod
    def create_linear_gradient(dwg, id, start, end, stops):
        """Создание линейного градиента"""
        grad = dwg.defs.add(dwg.linearGradient(id=id, x1=start[0], y1=start[1],
                                               x2=end[0], y2=end[1]))
        for offset, color in stops:
            grad.add_stop_color(offset=offset, color=color)
        return grad

    @staticmethod
    def create_radial_gradient(dwg, id, center, radius, stops):
        """Создание радиального градиента"""
        grad = dwg.defs.add(dwg.radialGradient(id=id, center=center, r=radius))
        for offset, color in stops:
            grad.add_stop_color(offset=offset, color=color)
        return grad

    @staticmethod
    def add_filter_blur(dwg, id, std_dev=2):
        """Добавление фильтра размытия"""
        filt = dwg.defs.add(dwg.filter(id=id))
        filt.feGaussianBlur(stdDeviation=std_dev)
        return filt

    @staticmethod
    def add_filter_shadow(dwg, id, dx=2, dy=2, blur=3, color='black'):
        """Добавление фильтра тени"""
        filt = dwg.defs.add(dwg.filter(id=id))
        filt.feOffset(dx=dx, dy=dy, result='offset')
        filt.feGaussianBlur(stdDeviation=blur, result='blur')
        filt.feFlood(flood_color=color, result='flood')
        filt.feComposite(in_='flood', in2='blur', operator='in', result='comp')
        filt.feMerge([
            filt.feMergeNode(in_='comp'),
            filt.feMergeNode(in_='SourceGraphic')
        ])
        return filt

    @staticmethod
    def add_animation(dwg, element_id, attribute, values, dur="2s", repeatCount="indefinite"):
        """Добавление анимации"""
        anim = dwg.animate(
            attributeName=attribute,
            values=values,
            dur=dur,
            repeatCount=repeatCount
        )
        element = dwg.getElementById(element_id)
        if element:
            element.add(anim)
        return anim

    @staticmethod
    def import_svg(filepath):
        """Импорт SVG файла"""
        try:
            tree = ET.parse(filepath)
            root = tree.getroot()
            return ET.tostring(root, encoding='unicode')
        except Exception as e:
            raise Exception(f"Ошибка импорта SVG: {str(e)}")

    @staticmethod
    def export_png(svg_content, width, height):
        """Экспорт в PNG (заглушка - требует Cairo)"""
        # В реальности нужен Cairo или другой конвертер
        return None

    @staticmethod
    def trace_image(image_path, threshold=128):
        """Трассировка растрового изображения (заглушка)"""
        # В реальности нужна библиотека типа Potrace
        return None