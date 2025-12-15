# services/text_service.py
import svgwrite
import math


class TextService:
    @staticmethod
    def create_text_on_path(dwg, text, path_id, **style):
        """Создание текста вдоль пути"""
        text_path = dwg.text('', **style)
        text_path.add(dwg.textPath(path=f'#{path_id}', text=text))
        return text_path

    @staticmethod
    def create_circular_text(dwg, text, center_x, center_y, radius, **style):
        """Создание кругового текста"""
        # Создаем невидимый путь - окружность
        path = dwg.path(
            d=f'M {center_x - radius},{center_y} A {radius},{radius} 0 0,1 {center_x + radius},{center_y}',
            fill='none',
            stroke='none',
            id=f'circle-path-{id(text)}'
        )
        dwg.defs.add(path)

        # Создаем текст по этому пути
        return TextService.create_text_on_path(dwg, text, path.attribs['id'], **style)

    @staticmethod
    def convert_text_to_path(dwg, text_element):
        """Преобразование текста в контуры (упрощенно)"""
        # В реальности это сложная операция, требующая информации о шрифтах
        # Здесь возвращаем путь, имитирующий текст
        text = text_element.text
        x = float(text_element.attribs.get('x', 0))
        y = float(text_element.attribs.get('y', 0))

        # Создаем простой путь, представляющий текст
        path_data = f'M {x},{y} '
        for i, char in enumerate(text):
            path_data += f'l {10},{0} '  # Простая линия для каждого символа

        path = dwg.path(d=path_data, **text_element.attribs)
        return path

    @staticmethod
    def create_text_with_effects(dwg, text, x, y, effects, **style):
        """Создание текста с эффектами"""
        text_element = dwg.text(text, insert=(x, y), **style)

        for effect in effects:
            if effect == 'shadow':
                # Создаем тень
                shadow = dwg.text(text, insert=(x + 2, y + 2), **style)
                shadow.fill('rgba(0,0,0,0.5)')
                text_element = dwg.g()
                text_element.add(shadow)
                text_element.add(dwg.text(text, insert=(x, y), **style))

            elif effect == 'outline':
                # Создаем обводку
                outline = dwg.text(text, insert=(x, y), **style)
                outline.fill('none')
                outline.stroke('black', width=2)

                text_element = dwg.g()
                text_element.add(outline)
                text_element.add(dwg.text(text, insert=(x, y), **style))

        return text_element