from datetime import datetime
import click

from flask import Flask, render_template, redirect, url_for, flash, request
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length, EqualTo, Email, ValidationError
from werkzeug.security import generate_password_hash, check_password_hash
# Odstránené nepoužívané importy ako inspect a pymysql.

# --- 1. INITIALIZATION ---

# Create Flask application instance
app = Flask(__name__)

# Nastavenie konfigurácie
app.config['SECRET_KEY'] = 'tvoje_tajne_heslo_ktore_si_zmenis' # Zmeňte toto!!!
# Nastavenie SQLite databázy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializácia databázového objektu
db = SQLAlchemy(app)

# Inicializácia Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login' # Presmeruje sem pri neprihlásenom prístupe

# Aby bol current_user dostupný vo všetkých šablónach (potrebné pre base.html)
@app.context_processor
def inject_user():
    return dict(current_user=current_user)

# Načítava používateľa z ID pre Flask-Login (Používa moderné db.session.get)
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# --- 2. MODEL DATABÁZY ---
# --- 2. MODEL DATABÁZY --- (rozšíriť)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True)

    # Vzťahy
    listings = db.relationship('Listing', backref='category', lazy=True)
    subcategories = db.relationship('Category', backref=db.backref('parent', remote_side=[id]), lazy=True)


class Listing(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    location = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    status = db.Column(db.String(20), default='active')  # active, sold, expired
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Vzťahy
    images = db.relationship('Image', backref='listing', lazy=True, cascade='all, delete-orphan')
    messages = db.relationship('Message', backref='listing', lazy=True)
    favorites = db.relationship('Favorite', backref='listing', lazy=True)


class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(300), nullable=False)
    listing_id = db.Column(db.Integer, db.ForeignKey('listing.id'), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    listing_id = db.Column(db.Integer, db.ForeignKey('listing.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)


class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    listing_id = db.Column(db.Integer, db.ForeignKey('listing.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# Rozšíriť User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='user')  # user, admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Vzťahy
    listings = db.relationship('Listing', backref='author', lazy=True)
    sent_messages = db.relationship('Message', foreign_keys=[Message.sender_id], backref='sender', lazy=True)
    received_messages = db.relationship('Message', foreign_keys=[Message.receiver_id], backref='receiver', lazy=True)
    favorites = db.relationship('Favorite', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


# --- 3. FORMULÁRE (Flask-WTF) ---

class RegistrationForm(FlaskForm):
    username = StringField('Používateľské meno', validators=[DataRequired(), Length(min=2, max=20)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Heslo', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Potvrdenie hesla', validators=[DataRequired(), EqualTo('password',
                                                                                             message='Heslá sa musia zhodovať.')])
    submit = SubmitField('Registrovať')

    # Vlastné validátory (Používa modernú syntax SQLAlchemy)
    def validate_username(self, username):
        user = db.session.execute(db.select(User).filter_by(username=username.data)).scalar_one_or_none()
        if user:
            raise ValidationError('Toto meno je už obsadené. Zvoľte si iné.')

    def validate_email(self, email):
        user = db.session.execute(db.select(User).filter_by(email=email.data)).scalar_one_or_none()
        if user:
            raise ValidationError('Táto emailová adresa je už zaregistrovaná.')


class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Heslo', validators=[DataRequired()])
    submit = SubmitField('Prihlásiť sa')


# --- 4. ROUTES (Cesty aplikácie) ---

@app.route('/')
def home():
    return render_template('index.html')


# REGISTER
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)

        db.session.add(user)
        db.session.commit()

        flash('Váš účet bol úspešne vytvorený! Môžete sa prihlásiť.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html', form=form)


# LOGIN
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    form = LoginForm()
    if form.validate_on_submit():
        user = db.session.execute(db.select(User).filter_by(email=form.email.data)).scalar_one_or_none()

        if user and user.check_password(form.password.data):
            login_user(user)
            flash('Boli ste úspešne prihlásený!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('home'))
        else:
            flash('Prihlásenie neúspešné. Skontrolujte email a heslo.', 'danger')

    return render_template('login.html', form=form)


# LOGOUT
@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash('Boli ste odhlásený.', 'info')
    return redirect(url_for('home'))


# Chránená stránka (len pre test)
@app.route('/dashboard')
@login_required
def dashboard():
    # Pre tento príklad predpokladáme, že máte vytvorený aj dashboard.html
    return f'Ahoj, {current_user.username}! Si prihlásený a vidíš svoj dashboard.'

# --- 5. APPLICATION RUNNER ---
def create_db():
    """Volá db.create_all() v aplikačnom kontexte."""
    with app.app_context():
        db.create_all()
        print("Databáza a tabuľky boli úspešne vytvorené v data.db")

# CLI príkaz pre vytvorenie databázy
@app.cli.command("create-db")
def create_db_command():
    """Vytvorí databázové tabuľky."""
    create_db()

if __name__ == '__main__':
    # Automaticky vytvorí databázu pri priamom spustení
    create_db()
    app.run(debug=True)