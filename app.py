from flask import Flask
from extensions import db, login_manager
from models import User
import routes


def create_app():
    app = Flask(__name__)

    # Konfigurácia
    app.config['SECRET_KEY'] = 'tvoje_tajne_heslo_ktore_si_zmenis'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Inicializácia rozšírení
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'login'

    return app


def init_db(app):
    """Vytvorí databázové tabuľky"""
    with app.app_context():
        db.create_all()


if __name__ == '__main__':
    app = create_app()


    # Nastavenie context processor
    @app.context_processor
    def inject_user():
        from flask_login import current_user
        return dict(current_user=current_user)


    # User loader pre Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        from models import User
        return db.session.get(User, int(user_id))


    # Import a registrácia všetkých routes
    from routes import register_routes

    register_routes(app)  # TOTO JE KĽÚČOVÉ!

    # Inicializácia databázy
    init_db(app)

    app.run(debug=True)