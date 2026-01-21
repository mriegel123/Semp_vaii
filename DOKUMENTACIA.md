# Programátorská dokumentácia - Trhovisko (Flask Inzerčný Portál)

## Obsah
1. [Prehľad aplikácie](#prehľad-aplikácie)
2. [Architektúra projektu](#architektúra-projektu)
3. [Ako Flask funguje v tejto aplikácii](#ako-flask-funguje-v-tejto-aplikácii)
4. [Databázové modely](#databázové-modely)
5. [Routes (Endpoints)](#routes-endpoints)
6. [Admin panel](#admin-panel)
7. [AJAX a klientská logika](#ajax-a-klientská-logika)
8. [Formuláre](#formuláre)
9. [Frontend štruktúra](#frontend-štruktúra)
10. [Autentifikácia a autorizácia](#autentifikácia-a-autorizácia)
11. [Spustenie aplikácie (konzola)](#spustenie-aplikácie-konzola)
12. [Bezpečnosť](#bezpečnosť)

---

## Prehľad aplikácie

**Trhovisko** je moderný inzerčný webový portál vytvorený pomocou Flask frameworku. Umožňuje používateľom:
- Registráciu a prihlásenie
- Vytváranie, úpravu a mazanie inzerátov
- Vyhľadávanie a filtrovanie inzerátov
- Pridávanie inzerátov do obľúbených
- Komunikáciu medzi používateľmi cez správy
- Nahrávanie obrázkov k inzerátom

### Použité technológie
| Technológia | Účel |
|-------------|------|
| **Flask** | Backend framework |
| **SQLAlchemy** | ORM pre databázu |
| **Flask-Login** | Správa používateľských sessions |
| **Flask-WTF** | Formuláre a CSRF ochrana |
| **SQLite** | Databáza |
| **Bootstrap 5** | Frontend CSS framework |
| **Jinja2** | Šablónovací engine |

---

## Architektúra projektu

```
FlaskProject1/
├── app.py              # Inicializácia Flask aplikácie (factory + registrácia routes)
├── run.py              # Alternatívny vstupný bod aplikácie
├── routes.py           # Všetky route handlery (UI + API)
├── models.py           # Databázové modely
├── forms.py            # WTForms formuláre
├── extensions.py       # Flask rozšírenia (db, login_manager)
├── requirements.txt    # Python závislosti
├── instance/
│   └── data.db         # SQLite databáza
├── static/
│   ├── css/
│   │   └── main.css    # Vlastné štýly
│   ├── js/
│   │   ├── dashboard.js      # Dashboard logika (AJAX pre moje inzeráty, zmenu hesla)
│   │   ├── messages.js       # Správy (konverzácie, odosielanie, počty)
│   │   ├── favourites.js     # Obľúbené (toggle cez AJAX)
│   │   ├── listing_detail.js # Detail inzerátu (mazanie, galéria)
│   │   └── main.js           # Hlavný JS
│   └── uploads/              # Nahrané obrázky
└── templates/
    ├── base.html                     # Základná šablóna
    ├── index.html                    # Domovská stránka
    ├── login.html                    # Prihlásenie
    ├── register.html                 # Registrácia
    ├── dashboard.html                # Používateľský dashboard
    ├── listings.html                 # Zoznam inzerátov
    ├── listing_detail.html           # Detail inzerátu
    ├── new_listing.html              # Nový inzerát
    ├── edit_listing.html             # Úprava inzerátu
    └── admin/
        ├── base_admin.html           # Admin layout (bočné menu)
        ├── dashboard.html            # Admin dashboard so štatistikami
        ├── users.html                # Správa používateľov (mazanie, roly)
        ├── listings.html             # Správa inzerátov (mazanie)
        ├── messages.html             # Správa správ (mazanie)
        └── categories.html           # Správa kategórií (pridanie/mazanie)
```

### Tok dát v aplikácii

```
[Prehliadač] <--> [Flask Routes] <--> [SQLAlchemy Models] <--> [SQLite DB]
      |                 |
      |                 v
      |           [Jinja2 Templates]
      |                 |
      v                 v
[JavaScript] <--> [JSON API Responses]
```

---

## Ako funguje Flask v tejto aplikácii

- Aplikácia sa skladá z inicializačného súboru `app.py` (factory `create_app()`), kde sa:
  - vytvorí `Flask` inštancia,
  - nainicializujú rozšírenia v `extensions.py` (`db = SQLAlchemy()`, `login_manager = LoginManager()`),
  - nakonfiguruje `SECRET_KEY` a `SQLALCHEMY_DATABASE_URI`,
  - zaregistrujú všetky routes cez `register_routes(app)` z `routes.py`.
- `run.py` obsahuje alternatívnu (samostatnú) spustiteľnú aplikáciu s definíciami modelov a routes inline. V bežnom nasadení odporúčame `app.py + routes.py` (čistejšie oddelenie vrstiev).
- `login_manager.user_loader` načítava používateľa z DB podľa ID; `login_manager.login_view = 'login'` zabezpečí presmerovanie neprihlásených používateľov.
- `@app.context_processor` sprístupňuje `current_user` vo všetkých šablónach.
- Šablóny sú renderované pomocou `render_template(...)` a komunikácia s DB prebieha cez SQLAlchemy ORM (`db.session`).
- API endpoints vracajú JSON pomocou `jsonify(...)` a sú volané z JavaScriptu (fetch API).

---

## Databázové modely

### User (Používateľ)
```python
class User(db.Model, UserMixin):
    id              # Integer, primárny kľúč
    username        # String(20), unikátne, povinné
    email           # String(120), unikátne, povinné
    password_hash   # String(128), hashované heslo
    role            # String(20), default='user'
    created_at      # DateTime, automaticky nastavené
    
    # Vzťahy (kaskádové mazanie je povolené):
    listings            # Inzeráty používateľa (cascade)
    sent_messages       # Odoslané správy (cascade)
    received_messages   # Prijaté správy (cascade)
    favorites           # Obľúbené inzeráty (cascade)
```

### Category (Kategória)
```python
class Category(db.Model):
    id          # Integer, primárny kľúč
    name        # String(100), povinné
    description # Text
    parent_id   # FK na Category (pre podkategórie)
    
    # Vzťahy:
    listings      # Inzeráty v kategórii
    subcategories # Podkategórie
```

### Listing (Inzerát)
```python
class Listing(db.Model):
    id          # Integer, primárny kľúč
    title       # String(200), povinné
    description # Text, povinné
    price       # Float, povinné
    location    # String(200)
    user_id     # FK na User
    category_id # FK na Category
    status      # String(20), default='active' (active/sold/expired)
    created_at  # DateTime
    
    # Vzťahy:
    images     # Obrázky inzerátu (cascade delete)
    messages   # Správy k inzerátu
    favorites  # Obľúbenia inzerátu
```

### Image (Obrázok)
```python
class Image(db.Model):
    id          # Integer, primárny kľúč
    filename    # String(300), názov súboru
    listing_id  # FK na Listing
    is_primary  # Boolean, hlavný obrázok
```

### Message (Správa)
```python
class Message(db.Model):
    id          # Integer, primárny kľúč
    content     # Text, obsah správy
    sender_id   # FK na User (odosielateľ)
    receiver_id # FK na User (príjemca)
    listing_id  # FK na Listing (voliteľné)
    created_at  # DateTime
    is_read     # Boolean, prečítané
```

### Favorite (Obľúbené)
```python
class Favorite(db.Model):
    id          # Integer, primárny kľúč
    user_id     # FK na User
    listing_id  # FK na Listing
    created_at  # DateTime
```

---

## Routes (Endpoints)

### Verejné routes (bez prihlásenia)

| Route | Metódy | Funkcia | Popis |
|-------|--------|---------|-------|
| `/` | GET | `home()` | Domovská stránka s kategóriami a 6 najnovšími inzerátmi |
| `/register` | GET, POST | `register()` | Registrácia nového používateľa |
| `/login` | GET, POST | `login()` | Prihlásenie používateľa |
| `/listings` | GET | `listings()` | Zoznam inzerátov s filtrom a stránkovaním |
| `/listings/<id>` | GET | `listing_detail(id)` | Detail konkrétneho inzerátu |

---

### Dashboard routes

| Route | Metódy | Vyžaduje | Popis |
|-------|--------|----------|-------|
| `/dashboard` | GET | login | Používateľský dashboard s tabmi |
| `/listings/new` | GET, POST | login | Vytvorenie nového inzerátu |
| `/listings/<id>/edit` | GET, POST | login + vlastník | Úprava inzerátu |
| `/listings/<id>/delete` | POST | login + vlastník | Zmazanie inzerátu (JSON odpoveď) |

---

### API routes (výber)

- Správy (messages):
  - `GET /api/my-messages` – všetky správy používateľa (chronologicky)
  - `GET /api/conversations` – zoznam konverzácií (posledná správa, počet neprečítaných)
  - `GET /api/conversation/<other_user_id>` – správy s používateľom (bez inzerátu)
  - `GET /api/conversation/<other_user_id>/<listing_id>` – správy k inzerátu
  - `POST /api/send-message` – odoslanie správy (JSON)
  - `POST /api/messages/<message_id>/read` – označenie správy ako prečítanej
  - `GET /api/unread-messages-count` – počet neprečítaných správ

- Obľúbené (favorites):
  - `POST /toggle-favorite` – toggle obľúbeného; vie vrátiť JSON (AJAX) alebo redirect (form)
  - `POST /api/favorite/<listing_id>` – čisté JSON API na toggle (použité v niektorých častiach)
  - `GET /api/check-favorite/<listing_id>` – kontrola stavu obľúbenia
  - `GET /api/my-favorites` – zoznam obľúbených inzerátov

- Moje inzeráty a profil:
  - `GET /api/my-listings` – inzeráty prihláseného používateľa
  - `POST /api/validate-password` – validácia aktuálneho hesla (AJAX)
  - `POST /api/change-password` – zmena hesla (AJAX)

---

## Admin panel

Admin panel je dostupný len pre používateľov s rolou `admin`.

- Navigácia: odkaz „Admin“ sa zobrazuje v `base.html` iba ak `current_user.is_admin()`.
- Layout: `templates/admin/base_admin.html` – bočné menu (Dashboard, Používatelia, Inzeráty, Správy, Kategórie).
- Šablóny: `templates/admin/*.html` (users, listings, messages, categories, dashboard).

### Admin routes

| Route | Metódy | Popis |
|-------|--------|-------|
| `/admin` | GET | Prehľad štatistík (používatelia, inzeráty, správy, kategórie) |
| `/admin/users` | GET | Zoznam používateľov |
| `/admin/users/<user_id>/delete` | POST | Zmazanie používateľa (vrátane všetkých jeho dát) |
| `/admin/users/<user_id>/toggle-role` | POST | Zmena role user/admin |
| `/admin/listings` | GET | Zoznam inzerátov |
| `/admin/listings/<listing_id>/delete` | POST | Zmazanie inzerátu |
| `/admin/messages` | GET | Zoznam správ |
| `/admin/messages/<message_id>/delete` | POST | Zmazanie správy |
| `/admin/categories` | GET | Správa kategórií |
| `/admin/categories/add` | POST | Pridanie kategórie |
| `/admin/categories/<category_id>/delete` | POST | Zmazanie kategórie (ak nemá inzeráty) |

### Kaskádové mazanie pri zmazaní používateľa

- V `models.py` sú vzťahy na `User` nastavené s `cascade='all, delete-orphan'` (listings, sent_messages, received_messages, favorites).
- Pri zmazaní používateľa sa automaticky zmažú všetky jeho inzeráty, správy a obľúbené položky (SQLAlchemy vyrieši poradie).
- Bezpečnostné obmedzenia:
  - Nemožno zmazať seba samého (`admin_delete_user` kontroluje `user.id == current_user.id`).
  - Toggle role samému sebe je zakázaný.

---

## AJAX a klientská logika

### Správy (static/js/messages.js)
- `loadConversations()` volá `GET /api/conversations` a vykreslí zoznam konverzácií (posledná správa, počet neprečítaných).
- `openConversation(otherUserId, listingId)` načíta správy cez `GET /api/conversation/...`, nastaví skryté polia pre odpoveď a označí prijaté správy za prečítané.
- `sendMessage(event)` posiela nové správy cez `POST /api/send-message` s JSON telom; po úspechu obnoví aktuálnu konverzáciu.
- `updateUnreadCount()` periodicky (30 s) volá `GET /api/unread-messages-count` a aktualizuje badge v UI.
- Integrované s Bootstrap tabs: pri zobrazení tabu „Správy“ sa konverzácie načítajú (event `shown.bs.tab`).

### Obľúbené (static/js/favourites.js)
- `initializeFavoriteButtons()` zavesí click handler na tlačidlá s triedou `.favorite-btn`.
- `toggleFavorite(listingId, el)` posiela `FormData` na `POST /toggle-favorite`:
  - Server rozlíši AJAX (odpovie JSON) vs. klasický formulár (redirect). V AJAX režime sa tlačidlo a badge okamžite aktualizujú.
- Prehľad obľúbených využíva `GET /api/my-favorites`.

### Moje inzeráty a zmena hesla (static/js/dashboard.js)
- `loadMyListings()` načíta `GET /api/my-listings` a vykreslí tabuľku kariet.
- `changePassword()` posiela `POST /api/change-password` s JSON – UI zobrazí úspech/chybu bez reloadu.

### Typické JSON odpovede
- Úspech: `{ "success": true, "message": "..." }`
- Chyba validácie: HTTP 400/401 + `{ "success": false, "message": "..." }`
- Zoznamy: polia objektov (napr. správy, inzeráty)

---

## Formuláre

- `RegistrationForm`, `LoginForm`, `ListingForm`, `ChangePasswordForm` (viď `forms.py`): server-side validácie, CSRF token cez Flask-WTF.
- Niektoré akcie majú dve formy použitia:
  - Klasický POST formulár (redirect + flash správy),
  - AJAX (JSON odpoveď) – bez reloadu stránky.

---

## Frontend štruktúra

- Bootstrap 5 (CDN) + Bootstrap Icons (pre admin panel a UI ikony).
- `base.html` obsahuje navigáciu, flash messages, a bloky `content`/`scripts`.
- Šablóny používajú Jinja2 (podmienené bloky podľa `current_user`, slučky, filter formátovania dátumu, atď.).

---

## Autentifikácia a autorizácia

- Flask-Login: `login_manager.login_view = 'login'` a `@login_required` chránia routes.
- Kontrola vlastníctva pred úpravami/mazaním inzerátov.
- Admin-only dekorátor (`admin_required`) guarduje admin sekciu.
- Heslá sú hashované (Werkzeug `generate_password_hash`).

---

## Spustenie aplikácie (konzola)

- Predpoklad: Python 3.11+ a `pip`.

```powershell
# 1) Vytvoriť a aktivovať virtuálne prostredie (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2) Nainštalovať závislosti
pip install -r requirements.txt

# 3) Inicializovať databázu (ak ešte neexistuje)
python -c "from app import create_app; from extensions import db; app = create_app(); app.app_context().push(); db.create_all()"

# 5) Spustiť aplikáciu
python .\run.py
```

- Aplikácia beží na `http://127.0.0.1:5000/` (ak nie je v kóde nastavené inak).

---

## Bezpečnosť

### Implementované opatrenia
1. **CSRF ochrana** – Flask-WTF na formulároch.
2. **Password hashing** – Werkzeug `generate_password_hash`/`check_password_hash`.
3. **SQL Injection ochrana** – SQLAlchemy ORM, parameter binding.
4. **XSS ochrana** – Jinja2 auto-escaping.
5. **File upload validácia** – Kontrola prípony a bezpečný názov súboru (`secure_filename`).
6. **Autorizácia** – Kontrola vlastníctva a admin-only dekorátor.

### Odporúčania pre produkciu
- Zmeniť `SECRET_KEY` na náhodný reťazec (env premenná).
- Nastaviť `DEBUG = False` mimo vývoja.
- Použiť HTTPS a reverse proxy.
- Validovať MIME typy uploadov a limitovať veľkosť súborov.

---

*Dokumentácia aktualizovaná: 20.01.2026*
