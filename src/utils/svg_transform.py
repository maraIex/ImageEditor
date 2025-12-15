# utils/svg_transform.py
import re
import math


class SVGTransform:
    @staticmethod
    def parse_transform(transform_str):
        """Парсинг строки трансформации"""
        if not transform_str:
            return []

        transforms = []
        pattern = r'(\w+)\(([^)]+)\)'

        for match in re.finditer(pattern, transform_str):
            name = match.group(1)
            params = [float(p) for p in match.group(2).split(',') if p.strip()]
            transforms.append({'type': name, 'params': params})

        return transforms

    @staticmethod
    def apply_transform(element, transform_type, params):
        """Применение трансформации к элементу"""
        current_transform = element.get('transform', '')

        if transform_type == 'translate':
            transform = f'translate({params[0]},{params[1]})'
        elif transform_type == 'rotate':
            if len(params) == 1:
                transform = f'rotate({params[0]})'
            else:
                transform = f'rotate({params[0]},{params[1]},{params[2]})'
        elif transform_type == 'scale':
            if len(params) == 1:
                transform = f'scale({params[0]})'
            else:
                transform = f'scale({params[0]},{params[1]})'
        elif transform_type == 'skewX':
            transform = f'skewX({params[0]})'
        elif transform_type == 'skewY':
            transform = f'skewY({params[0]})'
        elif transform_type == 'matrix':
            transform = f'matrix({",".join(map(str, params))})'
        else:
            return current_transform

        if current_transform:
            return f'{current_transform} {transform}'
        return transform

    @staticmethod
    def calculate_bounding_box(element):
        """Вычисление ограничивающего прямоугольника элемента"""
        # Это упрощенная версия, в реальности нужен более сложный расчет
        bbox = {'x': 0, 'y': 0, 'width': 0, 'height': 0}

        tag = element.tag.split('}')[-1]  # Убираем namespace

        if tag == 'rect':
            bbox['x'] = float(element.get('x', 0))
            bbox['y'] = float(element.get('y', 0))
            bbox['width'] = float(element.get('width', 0))
            bbox['height'] = float(element.get('height', 0))
        elif tag == 'circle':
            cx = float(element.get('cx', 0))
            cy = float(element.get('cy', 0))
            r = float(element.get('r', 0))
            bbox['x'] = cx - r
            bbox['y'] = cy - r
            bbox['width'] = r * 2
            bbox['height'] = r * 2
        elif tag == 'ellipse':
            cx = float(element.get('cx', 0))
            cy = float(element.get('cy', 0))
            rx = float(element.get('rx', 0))
            ry = float(element.get('ry', 0))
            bbox['x'] = cx - rx
            bbox['y'] = cy - ry
            bbox['width'] = rx * 2
            bbox['height'] = ry * 2
        elif tag == 'text':
            # Для текста нужна более сложная логика
            bbox['x'] = float(element.get('x', 0))
            bbox['y'] = float(element.get('y', 0))
            bbox['width'] = len(element.text) * 10  # Примерная ширина
            bbox['height'] = 20  # Примерная высота

        return bbox

    @staticmethod
    def align_elements(elements, alignment):
        """Выравнивание элементов"""
        if not elements:
            return

        bboxes = [SVGTransform.calculate_bounding_box(elem) for elem in elements]

        if alignment == 'left':
            min_x = min(bbox['x'] for bbox in bboxes)
            for elem, bbox in zip(elements, bboxes):
                dx = min_x - bbox['x']
                SVGTransform.apply_translate(elem, dx, 0)

        elif alignment == 'right':
            max_x = max(bbox['x'] + bbox['width'] for bbox in bboxes)
            for elem, bbox in zip(elements, bboxes):
                dx = max_x - (bbox['x'] + bbox['width'])
                SVGTransform.apply_translate(elem, dx, 0)

        elif alignment == 'top':
            min_y = min(bbox['y'] for bbox in bboxes)
            for elem, bbox in zip(elements, bboxes):
                dy = min_y - bbox['y']
                SVGTransform.apply_translate(elem, 0, dy)

        elif alignment == 'bottom':
            max_y = max(bbox['y'] + bbox['height'] for bbox in bboxes)
            for elem, bbox in zip(elements, bboxes):
                dy = max_y - (bbox['y'] + bbox['height'])
                SVGTransform.apply_translate(elem, 0, dy)

        elif alignment == 'center_horizontal':
            centers = [bbox['x'] + bbox['width'] / 2 for bbox in bboxes]
            avg_center = sum(centers) / len(centers)
            for elem, bbox in zip(elements, bboxes):
                dx = avg_center - (bbox['x'] + bbox['width'] / 2)
                SVGTransform.apply_translate(elem, dx, 0)

        elif alignment == 'center_vertical':
            centers = [bbox['y'] + bbox['height'] / 2 for bbox in bboxes]
            avg_center = sum(centers) / len(centers)
            for elem, bbox in zip(elements, bboxes):
                dy = avg_center - (bbox['y'] + bbox['height'] / 2)
                SVGTransform.apply_translate(elem, 0, dy)

    @staticmethod
    def apply_translate(element, dx, dy):
        """Применение перемещения"""
        current = element.get('transform', '')
        transform = f'translate({dx},{dy})'
        element.set('transform', f'{current} {transform}'.strip() if current else transform)