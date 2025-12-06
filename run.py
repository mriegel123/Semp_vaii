from datetime import datetime
import click
from wtforms import TextAreaField, FloatField
from flask_wtf.file import FileField, FileAllowed
from flask import Flask, render_template, redirect, url_for, flash, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.fields.choices import SelectField
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

class ChangePasswordForm(FlaskForm):
    current_password = PasswordField('Súčasné heslo', validators=[DataRequired()])
    new_password = PasswordField('Nové heslo', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Potvrdenie nového hesla',
                                     validators=[DataRequired(), EqualTo('new_password', message='Heslá sa musia zhodovať.')])
    submit = SubmitField('Zmeniť heslo')

class ListingForm(FlaskForm):
    title = StringField('Názov', validators=[DataRequired(), Length(min=5, max=200)])
    description = TextAreaField('Popis', validators=[DataRequired(), Length(min=10)])
    price = FloatField('Cena (€)', validators=[DataRequired()])
    location = StringField('Lokalita', validators=[DataRequired()])
    category_id = SelectField('Kategória', coerce=int, validators=[DataRequired()])
    images = FileField('Obrázky', validators=[FileAllowed(['jpg', 'jpeg', 'png', 'gif'])])
    submit = SubmitField('Uložiť inzerát')
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


# API endpoint pre validáciu hesla (AJAX) - len overenie, nie zmena
@app.route('/api/validate-password', methods=['POST'])
@login_required
def api_validate_password():
    data = request.get_json()

    # Validácia na strane servera
    if not data or 'current_password' not in data:
        return jsonify({'valid': False, 'message': 'Chýbajúce údaje'}), 400

    # Overenie súčasného hesla
    if current_user.check_password(data['current_password']):
        return jsonify({'valid': True, 'message': 'Heslo je správne'}), 200
    else:
        return jsonify({'valid': False, 'message': 'Súčasné heslo je nesprávne'}), 200

# Zmena hesla (klasický POST formulár)
@app.route('/change-password', methods=['POST'])
@login_required
def change_password():
    # Validácia na strane servera
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')

    # Základné validácie
    if not current_password or not new_password or not confirm_password:
        flash('Všetky polia sú povinné.', 'danger')
        return redirect(url_for('dashboard') + '#change-password')

    # Overenie súčasného hesla
    if not current_user.check_password(current_password):
        flash('Súčasné heslo je nesprávne.', 'danger')
        return redirect(url_for('dashboard') + '#change-password')

    # Kontrola zhody hesiel
    if new_password != confirm_password:
        flash('Nové heslá sa nezhodujú.', 'danger')
        return redirect(url_for('dashboard') + '#change-password')

    # Kontrola dĺžky hesla
    if len(new_password) < 6:
        flash('Nové heslo musí mať aspoň 6 znakov.', 'danger')
        return redirect(url_for('dashboard') + '#change-password')

    # Zmena hesla
    current_user.set_password(new_password)
    db.session.commit()

    flash('Heslo bolo úspešne zmenené!', 'success')
    return redirect(url_for('dashboard') + '#change-password')
# Chránená stránka (len pre test)
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')
# --- 5. APPLICATION RUNNER ---
def create_db():
    """Volá sa db.create_all()"""
    with app.app_context():
        db.create_all()



# Pridanie nového inzerátu
@app.route('/listings/new', methods=['GET', 'POST'])
@login_required
def new_listing():
    form = ListingForm()
    # Naplnenie kategórií do selectu
    form.category_id.choices = [(c.id, c.name) for c in Category.query.all()]

    if form.validate_on_submit():
        listing = Listing(
            title=form.title.data,
            description=form.description.data,
            price=form.price.data,
            location=form.location.data,
            user_id=current_user.id,
            category_id=form.category_id.data
        )

        db.session.add(listing)
        db.session.commit()

        flash('Inzerát bol úspešne pridaný!', 'success')
        return redirect(url_for('dashboard'))

    return render_template('new_listing.html', form=form)


# Zmena hesla (AJAX endpoint pre dashboard)
@app.route('/api/change-password', methods=['POST'])
@login_required
def api_change_password():
    # Získanie dát z JSON tela požiadavky
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    # 1. Základná kontrola prítomnosti údajov
    if not current_password or not new_password:
        return jsonify({'success': False, 'message': 'Chýbajú povinné polia.', 'field': 'all'}), 400

    # 2. Server-side kontrola dĺžky nového hesla (dobrá bezpečnostná prax)
    if len(new_password) < 6:
        return jsonify(
            {'success': False, 'message': 'Nové heslo musí mať minimálne 6 znakov.', 'field': 'new_password'}), 400

    # 3. Kontrola aktuálneho hesla
    if not check_password_hash(current_user.password_hash, current_password):
        # Vracia 401 Unauthorized, aby klientský kód vedel, že ide o zlyhanie overenia
        return jsonify({'success': False, 'message': 'Nesprávne súčasné heslo.', 'field': 'current_password'}), 401

    # 4. Zmena hesla
    try:
        current_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        # Úspešná odpoveď pre AJAX
        return jsonify({'success': True, 'message': 'Heslo bolo úspešne zmenené.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Chyba pri zmene hesla: {e}")
        return jsonify({'success': False, 'message': 'Chyba servera pri ukladaní nového hesla.'}), 500

@app.route('/api/my-listings')
@login_required
def api_my_listings():
    listings = Listing.query.filter_by(user_id=current_user.id).order_by(Listing.created_at.desc()).all()

    listings_data = []
    for listing in listings:
        listings_data.append({
            'id': listing.id,
            'title': listing.title,
            'description': listing.description,  # Pridané
            'price': listing.price,
            'location': listing.location,
            'status': listing.status,
            'created_at': listing.created_at.strftime('%d.%m.%Y') if listing.created_at else 'N/A',
            'category_name': listing.category.name if listing.category else 'Bez kategórie'
        })

    return jsonify(listings_data)
# Editácia inzerátu
@app.route('/listings/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_listing(id):
    listing = Listing.query.get_or_404(id)

    # Kontrola vlastníctva
    if listing.user_id != current_user.id:
        flash('Nemáte oprávnenie upravovať tento inzerát.', 'danger')
        return redirect(url_for('dashboard'))

    form = ListingForm(obj=listing)
    form.category_id.choices = [(c.id, c.name) for c in Category.query.all()]

    if form.validate_on_submit():
        listing.title = form.title.data
        listing.description = form.description.data
        listing.price = form.price.data
        listing.location = form.location.data
        listing.category_id = form.category_id.data

        db.session.commit()
        flash('Inzerát bol úspešne upravený!', 'success')
        return redirect(url_for('dashboard'))

    return render_template('edit_listing.html', form=form, listing=listing)


# Odstránenie inzerátu
@app.route('/listings/<int:id>/delete', methods=['POST'])
@login_required
def delete_listing(id):
    listing = Listing.query.get_or_404(id)

    # Kontrola vlastníctva
    if listing.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Nemáte oprávnenie'}), 403

    db.session.delete(listing)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Inzerát bol odstránený'}), 200









if __name__ == '__main__':
    # Automaticky vytvorí databázu pri priamom spustení
    create_db()
    app.run(debug=True)