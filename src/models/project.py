# models/project.py
import json
import uuid
from datetime import datetime


class Project:
    def __init__(self, name="Новый проект", width=800, height=600, unit="px"):
        self.id = str(uuid.uuid4())
        self.name = name
        self.created = datetime.now().isoformat()
        self.modified = self.created
        self.width = width
        self.height = height
        self.unit = unit
        self.layers = []
        self.history = []
        self.current_state = None

    def add_layer(self, layer):
        self.layers.append(layer)
        self.modified = datetime.now().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created": self.created,
            "modified": self.modified,
            "width": self.width,
            "height": self.height,
            "unit": self.unit,
            "layers": self.layers,
            "history": self.history[-10:]  # Последние 10 действий
        }

    def save(self, folder='projects'):
        filename = f"{folder}/{self.id}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
        return filename

    @classmethod
    def load(cls, filename):
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        project = cls(data['name'], data['width'], data['height'], data['unit'])
        project.id = data['id']
        project.created = data['created']
        project.modified = data['modified']
        project.layers = data['layers']
        project.history = data.get('history', [])
        return project