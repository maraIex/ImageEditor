"""
Модели данных для проектов векторного редактора
"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid


@dataclass
class CanvasSettings:
    """Настройки холста"""
    width: int = 800
    height: int = 600
    units: str = 'px'
    background_color: str = '#ffffff'
    grid_enabled: bool = True
    grid_size: int = 20

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        return cls(**data)


@dataclass
class Layer:
    """Слой проекта"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = 'Новый слой'
    elements: List[Dict] = field(default_factory=list)
    visible: bool = True
    locked: bool = False
    opacity: float = 1.0
    order: int = 0

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        return cls(**data)


@dataclass
class Project:
    """Проект векторного редактора"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = 'Безымянный проект'
    svg_content: str = ''
    layers: List[Layer] = field(default_factory=list)
    canvas: CanvasSettings = field(default_factory=CanvasSettings)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        data = asdict(self)
        data['layers'] = [layer.to_dict() for layer in self.layers]
        data['canvas'] = self.canvas.to_dict()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        layers_data = data.pop('layers', [])
        canvas_data = data.pop('canvas', {})

        layers = [Layer.from_dict(layer) for layer in layers_data]
        canvas = CanvasSettings.from_dict(canvas_data)

        return cls(layers=layers, canvas=canvas, **data)