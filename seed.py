from run import app, db, User, Category, Listing
from datetime import datetime, timedelta
import random


def seed_data():
    with app.app_context():
        # Vytvorenie admin používateľa
        admin = User(
            username='admin',
            email='admin@trhovisko.sk',
            role='admin'
        )
        admin.set_password('admin123')

        # Vytvorenie bežného používateľa
        user = User(
            username='testuser',
            email='user@trhovisko.sk',
            role='user'
        )
        user.set_password('test123')

        db.session.add_all([admin, user])
        db.session.commit()

        # Vytvorenie kategórií
        categories = [
            Category(name='Elektronika', description='Mobily, počítače, televízory'),
            Category(name='Oblečenie', description='Pánske, dámske, detské'),
            Category(name='Nábytok', description='Stoly, stoličky, postele'),
            Category(name='Autá', description='Osobné autá, motorky'),
            Category(name='Nehnuteľnosti', description='Byty, domy, pozemky'),
            Category(name='Šport', description='Bicykle, výbava'),
            Category(name='Práca', description='Ponuky práce'),
            Category(name='Služby', description='Rôzne služby'),
        ]

        db.session.add_all(categories)
        db.session.commit()

        # Vytvorenie testovacích inzerátov
        users = [admin, user]
        locations = ['Bratislava', 'Košice', 'Žilina', 'Prešov', 'Nitra', 'Trnava']

        listings_data = [
            ('iPhone 13 Pro Max', 'Výborný stav, 256GB, záruka do 12/2024', 850, 'Bratislava', 1),
            ('Knižnica drevená', 'Pevná, tmavá drevená knižnica, rozmer 180x80x40 cm', 120, 'Košice', 3),
            ('Bicykel MTB', 'Horský bicykel 27", 21 rýchlostí, nový', 350, 'Žilina', 6),
            ('Škoda Octavia 2018', '1.9 TDI, 140k km, plná výbava', 12500, 'Prešov', 4),
            ('Grafická karta RTX 3060', 'Nová, v orig. krabici, 12GB', 420, 'Nitra', 1),
            ('Drevený stôl', 'Pracovný stôl 160x80 cm, dubové drevo', 220, 'Trnava', 3),
            ('Bundy zimná', 'Pánska, veľkosť L, nová', 75, 'Bratislava', 2),
            ('PlayStation 5', 'S 2 ovládačmi, 5 hier', 450, 'Košice', 1),
        ]

        for i, (title, description, price, location, category_id) in enumerate(listings_data):
            listing = Listing(
                title=title,
                description=description,
                price=price,
                location=location,
                user_id=users[i % 2].id,
                category_id=category_id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
            )
            db.session.add(listing)

        db.session.commit()
        print('Seed dát bol úspešne vytvorený!')

        print('\n=== PRIHLASOVACIE ÚDAJE ===')
        print('Admin: admin@trhovisko.sk / admin123')
        print('User: user@trhovisko.sk / test123')
        print('===========================')


if __name__ == '__main__':
    seed_data()