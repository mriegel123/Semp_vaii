from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, login_required, logout_user, current_user
from extensions import db
from models import User, Category, Listing
from forms import RegistrationForm, LoginForm, ListingForm, ChangePasswordForm
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime


def register_routes(app):
    """Registruje všetky route handlers do aplikácie"""

    @app.route('/')
    def home():
        # Získanie kategórií pre vyhľadávací formulár
        categories = Category.query.all()

        # Získanie 6 najnovších aktívnych inzerátov
        latest_listings = Listing.query.filter_by(status='active') \
            .order_by(Listing.created_at.desc()) \
            .limit(6) \
            .all()



        return render_template('index.html', categories = categories, latest_listings=latest_listings)

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

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        flash('Boli ste odhlásený.', 'info')
        return redirect(url_for('home'))

    @app.route('/api/validate-password', methods=['POST'])
    @login_required
    def api_validate_password():
        data = request.get_json()

        if not data or 'current_password' not in data:
            return jsonify({'valid': False, 'message': 'Chýbajúce údaje'}), 400

        if current_user.check_password(data['current_password']):
            return jsonify({'valid': True, 'message': 'Heslo je správne'}), 200
        else:
            return jsonify({'valid': False, 'message': 'Súčasné heslo je nesprávne'}), 200

    @app.route('/change-password', methods=['POST'])
    @login_required
    def change_password():
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            flash('Všetky polia sú povinné.', 'danger')
            return redirect(url_for('dashboard') + '#change-password')

        if not current_user.check_password(current_password):
            flash('Súčasné heslo je nesprávne.', 'danger')
            return redirect(url_for('dashboard') + '#change-password')

        if new_password != confirm_password:
            flash('Nové heslá sa nezhodujú.', 'danger')
            return redirect(url_for('dashboard') + '#change-password')

        if len(new_password) < 6:
            flash('Nové heslo musí mať aspoň 6 znakov.', 'danger')
            return redirect(url_for('dashboard') + '#change-password')

        current_user.set_password(new_password)
        db.session.commit()

        flash('Heslo bolo úspešne zmenené!', 'success')
        return redirect(url_for('dashboard') + '#change-password')

    @app.route('/dashboard')
    @login_required
    def dashboard():
        return render_template('dashboard.html')

    @app.route('/listings/new', methods=['GET', 'POST'])
    @login_required
    def new_listing():
        form = ListingForm()
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

    @app.route('/api/change-password', methods=['POST'])
    @login_required
    def api_change_password():
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'success': False, 'message': 'Chýbajú povinné polia.', 'field': 'all'}), 400

        if len(new_password) < 6:
            return jsonify(
                {'success': False, 'message': 'Nové heslo musí mať minimálne 6 znakov.', 'field': 'new_password'}), 400

        if not check_password_hash(current_user.password_hash, current_password):
            return jsonify({'success': False, 'message': 'Nesprávne súčasné heslo.', 'field': 'current_password'}), 401

        try:
            current_user.password_hash = generate_password_hash(new_password)
            db.session.commit()
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
                'description': listing.description,
                'price': listing.price,
                'location': listing.location,
                'status': listing.status,
                'created_at': listing.created_at.strftime('%d.%m.%Y') if listing.created_at else 'N/A',
                'category_name': listing.category.name if listing.category else 'Bez kategórie'
            })

        return jsonify(listings_data)

    @app.route('/listings/<int:id>')
    def listing_detail(id):
        listing = Listing.query.get_or_404(id)

        # Získanie podobných inzerátov (z rovnakej kategórie)
        similar_listings = Listing.query \
            .filter(Listing.category_id == listing.category_id,
                    Listing.id != listing.id,
                    Listing.status == 'active') \
            .order_by(Listing.created_at.desc()) \
            .limit(4) \
            .all()

        return render_template('listing_detail.html',
                               listing=listing,
                               similar_listings=similar_listings)
    @app.route('/listings/<int:id>/edit', methods=['GET', 'POST'])
    @login_required
    def edit_listing(id):
        listing = Listing.query.get_or_404(id)

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

    @app.route('/listings')
    def listings():
        # Získanie všetkých aktívnych inzerátov
        all_listings = Listing.query.filter_by(status='active').order_by(Listing.created_at.desc()).all()

        # Pagination (voliteľné)
        page = request.args.get('page', 1, type=int)
        per_page = 12  # Počet inzerátov na stránku

        paginated_listings = Listing.query.filter_by(status='active') \
            .order_by(Listing.created_at.desc()) \
            .paginate(page=page, per_page=per_page, error_out=False)

        return render_template('listings.html',
                               listings=paginated_listings.items,
                               pagination=paginated_listings)


    # Route pre odoslanie správy
    @app.route('/send-message', methods=['POST'])
    @login_required
    def send_message():
        receiver_id = request.form.get('receiver_id')
        listing_id = request.form.get('listing_id')
        content = request.form.get('content')

        if not receiver_id or not content:
            flash('Chýbajúce údaje.', 'danger')
            return redirect(request.referrer or url_for('home'))

        message = Message(
            sender_id=current_user.id,
            receiver_id=receiver_id,
            listing_id=listing_id,
            content=content
        )

        try:
            db.session.add(message)
            db.session.commit()
            flash('Správa bola odoslaná.', 'success')
        except Exception as e:
            db.session.rollback()
            flash('Chyba pri odosielaní správy.', 'danger')

        return redirect(request.referrer or url_for('home'))

    # Route pre obľúbené
    @app.route('/toggle-favorite', methods=['POST'])
    @login_required
    def toggle_favorite():
        listing_id = request.form.get('listing_id')

        if not listing_id:
            flash('Chýbajúce údaje.', 'danger')
            return redirect(request.referrer or url_for('home'))

        # Skontrolovať, či už je inzerát v obľúbených
        favorite = Favorite.query.filter_by(
            user_id=current_user.id,
            listing_id=listing_id
        ).first()

        if favorite:
            # Odstrániť z obľúbených
            db.session.delete(favorite)
            action = 'odstránený'
        else:
            # Pridať do obľúbených
            favorite = Favorite(
                user_id=current_user.id,
                listing_id=listing_id
            )
            db.session.add(favorite)
            action = 'pridaný'

        try:
            db.session.commit()
            flash(f'Inzerát bol {action} do obľúbených.', 'success')
        except Exception as e:
            db.session.rollback()
            flash('Chyba pri ukladaní.', 'danger')

        return redirect(request.referrer or url_for('home'))

    # API endpoint pre kontrolu obľúbených
    @app.route('/api/check-favorite/<int:listing_id>')
    @login_required
    def check_favorite(listing_id):
        favorite = Favorite.query.filter_by(
            user_id=current_user.id,
            listing_id=listing_id
        ).first()

        return jsonify({'is_favorite': favorite is not None})
    @app.route('/listings/<int:id>/delete', methods=['POST'])
    @login_required
    def delete_listing(id):
        listing = Listing.query.get_or_404(id)

        if listing.user_id != current_user.id:
            return jsonify({'success': False, 'message': 'Nemáte oprávnenie'}), 403

        db.session.delete(listing)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Inzerát bol odstránený'}), 200