# services/animation_service.py
import svgwrite


class AnimationService:
    @staticmethod
    def create_smil_animation(dwg, element_id, animation_type, params):
        """Создание SMIL анимации"""
        if animation_type == 'opacity':
            return AnimationService.create_opacity_animation(dwg, element_id, params)
        elif animation_type == 'move':
            return AnimationService.create_move_animation(dwg, element_id, params)
        elif animation_type == 'rotate':
            return AnimationService.create_rotate_animation(dwg, element_id, params)
        elif animation_type == 'scale':
            return AnimationService.create_scale_animation(dwg, element_id, params)
        elif animation_type == 'color':
            return AnimationService.create_color_animation(dwg, element_id, params)
        else:
            raise ValueError(f"Неизвестный тип анимации: {animation_type}")

    @staticmethod
    def create_opacity_animation(dwg, element_id, params):
        """Анимация прозрачности"""
        anim = dwg.animate(
            attributeName='opacity',
            values=params.get('values', '1;0.5;1'),
            dur=params.get('duration', '2s'),
            repeatCount=params.get('repeat', 'indefinite'),
            id=f'anim-opacity-{element_id}'
        )

        element = dwg.getElementById(element_id)
        if element:
            element.add(anim)

        return anim

    @staticmethod
    def create_move_animation(dwg, element_id, params):
        """Анимация перемещения"""
        from_pos = params.get('from', [0, 0])
        to_pos = params.get('to', [100, 100])

        element = dwg.getElementById(element_id)
        if not element:
            return None

        if element.tagName == 'rect':
            anim_x = dwg.animate(
                attributeName='x',
                values=f'{from_pos[0]};{to_pos[0]};{from_pos[0]}',
                dur=params.get('duration', '2s'),
                repeatCount=params.get('repeat', 'indefinite')
            )

            anim_y = dwg.animate(
                attributeName='y',
                values=f'{from_pos[1]};{to_pos[1]};{from_pos[1]}',
                dur=params.get('duration', '2s'),
                repeatCount=params.get('repeat', 'indefinite')
            )

            element.add(anim_x)
            element.add(anim_y)

            return [anim_x, anim_y]

        elif element.tagName in ['circle', 'ellipse']:
            anim_cx = dwg.animate(
                attributeName='cx',
                values=f'{from_pos[0]};{to_pos[0]};{from_pos[0]}',
                dur=params.get('duration', '2s'),
                repeatCount=params.get('repeat', 'indefinite')
            )

            anim_cy = dwg.animate(
                attributeName='cy',
                values=f'{from_pos[1]};{to_pos[1]};{from_pos[1]}',
                dur=params.get('duration', '2s'),
                repeatCount=params.get('repeat', 'indefinite')
            )

            element.add(anim_cx)
            element.add(anim_cy)

            return [anim_cx, anim_cy]

    @staticmethod
    def create_rotate_animation(dwg, element_id, params):
        """Анимация вращения"""
        from_angle = params.get('from', 0)
        to_angle = params.get('to', 360)

        anim = dwg.animateTransform(
            attributeName='transform',
            type='rotate',
            values=f'{from_angle} 50 50;{to_angle} 50 50',
            dur=params.get('duration', '2s'),
            repeatCount=params.get('repeat', 'indefinite'),
            additive='sum'
        )

        element = dwg.getElementById(element_id)
        if element:
            element.add(anim)

        return anim

    @staticmethod
    def create_scale_animation(dwg, element_id, params):
        """Анимация масштабирования"""
        from_scale = params.get('from', 1)
        to_scale = params.get('to', 1.5)

        anim = dwg.animateTransform(
            attributeName='transform',
            type='scale',
            values=f'{from_scale};{to_scale};{from_scale}',
            dur=params.get('duration', '2s'),
            repeatCount=params.get('repeat', 'indefinite')
        )

        element = dwg.getElementById(element_id)
        if element:
            element.add(anim)

        return anim

    @staticmethod
    def create_color_animation(dwg, element_id, params):
        """Анимация цвета"""
        colors = params.get('colors', ['#FF0000', '#00FF00', '#0000FF', '#FF0000'])

        anim = dwg.animate(
            attributeName='fill',
            values=';'.join(colors),
            dur=params.get('duration', '3s'),
            repeatCount=params.get('repeat', 'indefinite')
        )

        element = dwg.getElementById(element_id)
        if element:
            element.add(anim)

        return anim

    @staticmethod
    def create_animation_sequence(dwg, element_id, animations):
        """Создание последовательности анимаций"""
        results = []

        for i, anim_def in enumerate(animations):
            anim_type = anim_def.get('type')
            params = anim_def.get('params', {})

            # Добавляем задержку для последовательности
            if i > 0:
                params['begin'] = f'anim-{i - 1}.end'

            anim = AnimationService.create_smil_animation(dwg, element_id, anim_type, params)
            if anim:
                if isinstance(anim, list):
                    results.extend(anim)
                else:
                    results.append(anim)

        return results