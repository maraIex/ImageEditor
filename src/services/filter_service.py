"""
Сервис для работы с фильтрами SVG
"""
from typing import Dict, Tuple
import uuid


class FilterService:
    """Сервис для создания SVG фильтров"""

    @staticmethod
    def create_filter(filter_type: str, params: Dict, filter_id: str = None) -> Tuple[str, str]:
        """Создание фильтра SVG"""
        if not filter_id:
            filter_id = f'filter_{uuid.uuid4().hex[:8]}'

        filter_svg = ''

        if filter_type == 'blur':
            std_dev = params.get('stdDeviation', 2)
            filter_svg = f'''
            <filter id="{filter_id}">
                <feGaussianBlur stdDeviation="{std_dev}"/>
            </filter>
            '''

        elif filter_type == 'shadow':
            dx = params.get('dx', 2)
            dy = params.get('dy', 2)
            std_dev = params.get('stdDeviation', 2)
            color = params.get('color', '#000000')
            opacity = params.get('opacity', 0.5)

            filter_svg = f'''
            <filter id="{filter_id}">
                <feDropShadow dx="{dx}" dy="{dy}" stdDeviation="{std_dev}" 
                             flood-color="{color}" flood-opacity="{opacity}"/>
            </filter>
            '''

        elif filter_type == 'glow':
            std_dev = params.get('stdDeviation', 5)
            color = params.get('color', '#00ff00')

            filter_svg = f'''
            <filter id="{filter_id}">
                <feGaussianBlur stdDeviation="{std_dev}" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            '''

        elif filter_type == 'emboss':
            filter_svg = f'''
            <filter id="{filter_id}">
                <feConvolveMatrix kernelMatrix="1 0 0 0 0 0 0 0 -1" 
                                 divisor="1" preserveAlpha="true"/>
            </filter>
            '''

        elif filter_type == 'invert':
            filter_svg = f'''
            <filter id="{filter_id}">
                <feColorMatrix type="matrix"
                    values="-1 0 0 0 1
                            0 -1 0 0 1
                            0 0 -1 0 1
                            0 0 0 1 0"/>
            </filter>
            '''

        elif filter_type == 'neon':
            filter_svg = f'''
            <filter id="{filter_id}">
                <feFlood flood-color="#00ffff" result="flood"/>
                <feComposite in="flood" in2="SourceGraphic" operator="in" result="mask"/>
                <feMorphology in="mask" operator="dilate" radius="2"/>
                <feGaussianBlur stdDeviation="5"/>
                <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            '''

        return filter_svg.strip(), filter_id

    @staticmethod
    def get_filter_info(filter_type: str = None) -> Dict:
        """Получение информации о фильтрах"""
        all_filters = {
            'blur': {
                'name': 'Размытие',
                'description': 'Добавляет размытие элементам',
                'params': [
                    {'name': 'stdDeviation', 'type': 'number', 'default': 2, 'min': 0, 'max': 20}
                ]
            },
            'shadow': {
                'name': 'Тень',
                'description': 'Добавляет тень элементам',
                'params': [
                    {'name': 'dx', 'type': 'number', 'default': 2, 'min': -20, 'max': 20},
                    {'name': 'dy', 'type': 'number', 'default': 2, 'min': -20, 'max': 20},
                    {'name': 'stdDeviation', 'type': 'number', 'default': 2, 'min': 0, 'max': 10},
                    {'name': 'color', 'type': 'color', 'default': '#000000'},
                    {'name': 'opacity', 'type': 'number', 'default': 0.5, 'min': 0, 'max': 1, 'step': 0.1}
                ]
            },
            'glow': {
                'name': 'Свечение',
                'description': 'Добавляет свечение элементам',
                'params': [
                    {'name': 'stdDeviation', 'type': 'number', 'default': 5, 'min': 0, 'max': 20},
                    {'name': 'color', 'type': 'color', 'default': '#00ff00'}
                ]
            },
            'emboss': {
                'name': 'Рельеф',
                'description': 'Создает рельефный эффект',
                'params': []
            },
            'invert': {
                'name': 'Инверсия',
                'description': 'Инвертирует цвета',
                'params': []
            },
            'neon': {
                'name': 'Неоновый',
                'description': 'Создает неоновое свечение',
                'params': []
            }
        }

        if filter_type:
            return all_filters.get(filter_type, {})
        return all_filters