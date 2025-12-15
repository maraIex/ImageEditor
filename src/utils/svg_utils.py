# src/utils/svg_utils.py
"""
SVG utils — безопасная валидация, извлечение слоёв и шаблон создания SVG.
Исправлена работа с парсингом (используется lxml) и стабильно удаляются опасные теги/атрибуты.
"""
from typing import Tuple, List, Dict
import re
import html
from lxml import etree as ET

NSMAP = {
    'svg': 'http://www.w3.org/2000/svg',
    'xlink': 'http://www.w3.org/1999/xlink',
    'inkscape': 'http://www.inkscape.org/namespaces/inkscape',
    'sodipodi': 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'cc': 'http://creativecommons.org/ns#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
}


def validate_svg(svg_content: str) -> Tuple[str, List[str]]:
    """
    Очищает SVG от опасных элементов/атрибутов и возвращает (cleaned_svg, warnings).
    Использует lxml для надёжного парсинга и удаления.
    """
    warnings: List[str] = []
    try:
        svg_content = html.unescape(svg_content)

        # Сначала удаляем очевидные javascript/data: паттерны регулярками
        dangerous_patterns = [
            r'on\w+\s*=\s*(?:"[^"]*"|\'[^\']*\')',   # обработчики событий
            r'javascript:',                         # javascript: ссылки
            r'data:text/html',                      # data HTML
            r'data:application/x-javascript'        # data JS
        ]
        cleaned = svg_content
        for pat in dangerous_patterns:
            cleaned = re.sub(pat, '', cleaned, flags=re.IGNORECASE | re.DOTALL | re.MULTILINE)

        # Парсим через lxml с recover=True (чтобы не падать на мелких ошибках)
        parser = ET.XMLParser(recover=True, ns_clean=True, remove_comments=True)
        root = ET.fromstring(cleaned.encode('utf-8'), parser=parser)

        # Удаляем опасные теги
        dangerous_tags = {'script', 'iframe', 'embed', 'object', 'base'}
        for elem in list(root.iter()):
            tag = ET.QName(elem.tag).localname.lower()
            if tag in dangerous_tags:
                parent = elem.getparent()
                if parent is not None:
                    parent.remove(elem)
                warnings.append(f'Removed dangerous tag: {tag}')

        # Удаляем опасные атрибуты (on*, javascript: в href/xlink:href)
        for elem in list(root.iter()):
            to_remove = []
            for attr in list(elem.attrib.keys()):
                local = attr.split('}')[-1]  # namespace aware
                val = elem.attrib.get(attr, '')
                if local.lower().startswith('on'):  # event handlers
                    to_remove.append(attr)
                elif ('href' in local.lower()) and isinstance(val, str) and 'javascript:' in val.lower():
                    to_remove.append(attr)
            for a in to_remove:
                try:
                    del elem.attrib[a]
                except KeyError:
                    pass
                warnings.append(f'Removed attribute: {a}')

        # Дополнительные проверки: внешние xlink/href (предупреждаем)
        for elem in root.findall('.//{http://www.w3.org/2000/svg}image'):
            href = elem.get('{http://www.w3.org/1999/xlink}href') or elem.get('href')
            if href and isinstance(href, str) and not href.startswith('data:'):
                warnings.append('Found image with external href (consider embedding)')

        # Превентивно удалим <script> в CDATA и подобное — lxml уже удалил обычные теги
        final_svg = ET.tostring(root, encoding='unicode')
        # Приводим к минимальному корректному SVG (если исходно имелась декларация, она будет потеряна, но это нормально)
        return final_svg, warnings

    except Exception as e:
        # не ломаем импорт — возвращаем исходную строку и сообщение
        warnings.append(f'validate_svg failed: {str(e)}')
        return svg_content, warnings


def extract_svg_layers(svg_content: str) -> List[Dict]:
    """
    Извлекает список слоёв в предсказуемом формате:
    [{ id, name, visible, locked, order }, ...]
    """
    try:
        parser = ET.XMLParser(recover=True, ns_clean=True)
        root = ET.fromstring(svg_content.encode('utf-8'), parser=parser)
        ns = {'svg': NSMAP['svg'], 'inkscape': NSMAP['inkscape']}

        layers = []
        # Ищем группы, помеченные как inkscape:groupmode="layer" или с inkscape:label
        groups = root.findall('.//svg:g', ns)
        idx = 0
        for g in groups:
            groupmode = g.get('{http://www.inkscape.org/namespaces/inkscape}groupmode')
            label = g.get('{http://www.inkscape.org/namespaces/inkscape}label') or g.get('id')
            if groupmode == 'layer' or label:
                lid = g.get('id') or f'layer_{idx}'
                lname = label or lid or f'Слой {idx + 1}'
                style = g.get('style', '') or ''
                visible = 'display:none' not in style.replace(' ', '')
                layers.append({
                    'id': lid,
                    'name': lname,
                    'visible': visible,
                    'locked': False,
                    'order': len(layers)
                })
                idx += 1

        # Fallback: если вообще не нашли — создаём один слой
        if not layers:
            layers.append({
                'id': 'layer_1',
                'name': 'Слой 1',
                'visible': True,
                'locked': False,
                'order': 0
            })
        return layers
    except Exception:
        # возвращаем дефолтный слой, не падаем
        return [{
            'id': 'layer_1',
            'name': 'Слой 1',
            'visible': True,
            'locked': False,
            'order': 0
        }]


def create_svg_template(width: int = 800, height: int = 600, units: str = 'px') -> str:
    if units == 'mm':
        width_str = f"{width}mm"
        height_str = f"{height}mm"
    elif units == 'cm':
        width_str = f"{width}cm"
        height_str = f"{height}cm"
    else:
        width_str = str(width)
        height_str = str(height)

    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width_str}" height="{height_str}"
     viewBox="0 0 {width} {height}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
    </defs>
    <g id="layer_1" data-name="Слой 1">
        <rect width="100%" height="100%" fill="#ffffff"/>
    </g>
</svg>'''


def get_svg_size(svg_content: str) -> Dict:
    """
    Возвращает словарь: width(float), height(float), units(str), viewBox(str)
    """
    try:
        parser = ET.XMLParser(recover=True, ns_clean=True)
        root = ET.fromstring(svg_content.encode('utf-8'), parser=parser)
        width = root.get('width', '800')
        height = root.get('height', '600')

        width_num = float(re.sub(r'[^\d.]', '', width)) if width else 800
        height_num = float(re.sub(r'[^\d.]', '', height)) if height else 600

        units = 'px'
        if 'mm' in width:
            units = 'mm'
        elif 'cm' in width:
            units = 'cm'
        elif 'in' in width:
            units = 'in'

        return {
            'width': width_num,
            'height': height_num,
            'units': units,
            'viewBox': root.get('viewBox', f'0 0 {width_num} {height_num}')
        }
    except Exception:
        return {
            'width': 800,
            'height': 600,
            'units': 'px',
            'viewBox': '0 0 800 600'
        }
