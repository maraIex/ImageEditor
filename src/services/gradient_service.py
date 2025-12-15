"""
Сервис для работы с градиентами
"""
from typing import List, Dict, Tuple
import uuid


class GradientService:
    """Сервис для создания и работы с градиентами SVG"""

    @staticmethod
    def create_linear_gradient(colors: List[str], x1: float = 0, y1: float = 0,
                               x2: float = 1, y2: float = 0,
                               gradient_id: str = None) -> Tuple[str, str]:
        """Создание линейного градиента"""
        if not gradient_id:
            gradient_id = f'gradient_{uuid.uuid4().hex[:8]}'

        stops = ''
        for i, color in enumerate(colors):
            offset = i / (len(colors) - 1) if len(colors) > 1 else 0
            stops += f'<stop offset="{offset}" stop-color="{color}"/>'

        gradient_svg = f'''
        <linearGradient id="{gradient_id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">
            {stops}
        </linearGradient>
        '''

        return gradient_svg.strip(), gradient_id

    @staticmethod
    def create_radial_gradient(colors: List[str], cx: float = 0.5, cy: float = 0.5,
                               r: float = 0.5, fx: float = None, fy: float = None,
                               gradient_id: str = None) -> Tuple[str, str]:
        """Создание радиального градиента"""
        if not gradient_id:
            gradient_id = f'gradient_{uuid.uuid4().hex[:8]}'

        if fx is None:
            fx = cx
        if fy is None:
            fy = cy

        stops = ''
        for i, color in enumerate(colors):
            offset = i / (len(colors) - 1) if len(colors) > 1 else 0
            stops += f'<stop offset="{offset}" stop-color="{color}"/>'

        gradient_svg = f'''
        <radialGradient id="{gradient_id}" cx="{cx}" cy="{cy}" r="{r}" fx="{fx}" fy="{fy}">
            {stops}
        </radialGradient>
        '''

        return gradient_svg.strip(), gradient_id

    @staticmethod
    def parse_gradient_string(gradient_svg: str) -> Dict:
        """Парсинг строки градиента"""
        # Простая реализация парсинга градиента
        info = {
            'type': 'unknown',
            'id': '',
            'colors': [],
            'params': {}
        }

        # Определяем тип градиента
        if 'linearGradient' in gradient_svg:
            info['type'] = 'linear'
        elif 'radialGradient' in gradient_svg:
            info['type'] = 'radial'

        # Извлекаем ID
        import re
        id_match = re.search(r'id="([^"]+)"', gradient_svg)
        if id_match:
            info['id'] = id_match.group(1)

        # Извлекаем цвета
        color_matches = re.findall(r'stop-color="([^"]+)"', gradient_svg)
        info['colors'] = color_matches

        return info