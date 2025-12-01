from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB

    from routes import bp
    app.register_blueprint(bp)

    os.makedirs("static/outputs", exist_ok=True)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
