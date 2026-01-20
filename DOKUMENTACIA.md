# Programátorská dokumentácia - Trhovisko (Flask Inzerčný Portál)

## Obsah
1. [Prehľad aplikácie](#prehľad-aplikácie)
2. [Architektúra projektu](#architektúra-projektu)
3. [Databázové modely](#databázové-modely)
4. [Routes (Endpoints)](#routes-endpoints)
5. [Formuláre](#formuláre)
6. [Frontend štruktúra](#frontend-štruktúra)
7. [Autentifikácia a autorizácia](#autentifikácia-a-autorizácia)
8. [Spustenie aplikácie](#spustenie-aplikácie)

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
├── app.py              # Inicializácia Flask aplikácie
├── run.py              # Vstupný bod aplikácie
├── routes.py           # Všetky route handlery
├── models.py           # Databázové modely
├── forms.py            # WTForms formuláre
├── extensions.py       # Flask rozšírenia (db)
├── seed.py             # Seed dáta pre databázu
├── requirements.txt    # Python závislosti
├── docker-compose.yml  # Docker konfigurácia
├── instance/
│   └── data.db         # SQLite databáza
├── static/
│   ├── css/
│   │   └── main.css    # Vlastné štýly
│   ├── js/
│   │   ├── dashboard.js      # Dashboard logika
│   │   ├── messages.js       # Správy (AJAX)
│   │   ├── favourites.js     # Obľúbené
│   │   ├── listing_detail.js # Detail inzerátu
│   │   ├── edit_listing.js   # Úprava inzerátu
│   │   ├── search.js         # Rýchle vyhľadávanie
│   │   └── main.js           # Hlavný JS
│   └── uploads/              # Nahrané obrázky
└── templates/
    ├── base.html             # Základná šablóna
    ├── index.html            # Domovská stránka
    ├── login.html            # Prihlásenie
    ├── register.html         # Registrácia
    ├── dashboard.html        # Používateľský dashboard
    ├── listings.html         # Zoznam inzerátov
    ├── listing_detail.html   # Detail inzerátu
    ├── new_listing.html      # Nový inzerát
    └── edit_listing.html     # Úprava inzerátu
```

### Tok dát v aplikácii

```
[Prehliadač] <--> [Flask Routes] <--> [SQLAlchemy Models] <--> [SQLite DB]
      |                 |
      |                 v
      |         [Jinja2 Templates]
      |                 |
      v                 v
[JavaScript] <--> [JSON API Responses]
```

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
    
    # Vzťahy:
    listings            # Inzeráty používateľa
    sent_messages       # Odoslané správy
    received_messages   # Prijaté správy
    favorites           # Obľúbené inzeráty
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

### ER Diagram
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────<│   Listing   │>────│  Category   │
│             │     │             │     │             │
│ id          │     │ id          │     │ id          │
│ username    │     │ title       │     │ name        │
│ email       │     │ description │     │ description │
│ password    │     │ price       │     │ parent_id   │
│ role        │     │ location    │     └─────────────┘
│ created_at  │     │ status      │           │
└─────────────┘     │ created_at  │           │
      │             └─────────────┘           │
      │                   │                   │
      │                   │                   │
      v                   v                   v
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Message    │     │   Image     │     │ Category    │
│             │     │             │     │ (child)     │
│ id          │     │ id          │     └─────────────┘
│ content     │     │ filename    │
│ sender_id   │     │ listing_id  │
│ receiver_id │     │ is_primary  │
│ listing_id  │     └─────────────┘
│ is_read     │
│ created_at  │
└─────────────┘

┌─────────────┐
│  Favorite   │
│             │
│ id          │
│ user_id     │
│ listing_id  │
│ created_at  │
└─────────────┘
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

### Autentifikačné routes

#### `GET/POST /register`
**Funkcia:** `register()`

Registrácia nového používateľa.

**Proces:**
1. Ak je používateľ prihlásený → presmerovanie na `/`
2. Validácia formulára (username, email, password)
3. Vytvorenie User objektu s hashovaným heslom
4. Uloženie do databázy
5. Flash správa o úspechu
6. Presmerovanie na `/login`

**Validácie:**
- Username: 2-20 znakov, unikátne
- Email: validný formát, unikátne
- Password: min. 6 znakov, potvrdenie

---

#### `GET/POST /login`
**Funkcia:** `login()`

Prihlásenie existujúceho používateľa.

**Proces:**
1. Ak je používateľ prihlásený → presmerovanie na `/`
2. Vyhľadanie používateľa podľa emailu
3. Overenie hesla pomocou `check_password()`
4. Vytvorenie session cez `login_user()`
5. Presmerovanie na `next` parameter alebo `/`

---

#### `GET /logout`
**Funkcia:** `logout()`

Odhlásenie používateľa.

**Vyžaduje:** Prihlásenie (`@login_required`)

**Proces:**
1. Zrušenie session cez `logout_user()`
2. Flash správa
3. Presmerovanie na `/`

---

### Dashboard routes

#### `GET /dashboard`
**Funkcia:** `dashboard()`

Používateľský dashboard s tabami.

**Vyžaduje:** Prihlásenie

**Obsah:**
- Profil používateľa
- Moje inzeráty
- Správy
- Obľúbené
- Zmena hesla

---

### Inzerátové routes

#### `GET/POST /listings/new`
**Funkcia:** `new_listing()`

Vytvorenie nového inzerátu.

**Vyžaduje:** Prihlásenie

**Proces:**
1. Načítanie kategórií pre select
2. Validácia formulára
3. Vytvorenie Listing objektu
4. Spracovanie nahraných obrázkov:
   - Kontrola povolených formátov (jpg, jpeg, png, gif)
   - Generovanie unikátneho názvu súboru
   - Uloženie do `static/uploads/`
   - Vytvorenie Image záznamu
5. Flash správa a presmerovanie na dashboard

---

#### `GET/POST /listings/<id>/edit`
**Funkcia:** `edit_listing(id)`

Úprava existujúceho inzerátu.

**Vyžaduje:** Prihlásenie, vlastníctvo inzerátu

**Proces:**
1. Načítanie inzerátu
2. Kontrola vlastníctva (`listing.user_id == current_user.id`)
3. Pre GET: naplnenie formulára existujúcimi dátami
4. Pre POST: aktualizácia dát a spracovanie nových obrázkov

---

#### `GET /listings`
**Funkcia:** `listings()`

Zoznam inzerátov s filtrovaním a stránkovaním.

**Query parametre:**
| Parameter | Typ | Popis |
|-----------|-----|-------|
| `q` | string | Fulltext vyhľadávanie (title, description) |
| `category` | int | ID kategórie |
| `min_price` | float | Minimálna cena |
| `max_price` | float | Maximálna cena |
| `location` | string | Lokalita (ILIKE) |
| `page` | int | Číslo stránky (default 1) |

**Stránkovanie:** 12 inzerátov na stránku

---

#### `POST /listings/<id>/delete`
**Funkcia:** `delete_listing(id)`

Zmazanie inzerátu.

**Vyžaduje:** Prihlásenie, vlastníctvo

**Odpoveď:** JSON `{success: true/false, message: string}`

---

#### `DELETE /listings/<listing_id>/images/<image_id>/delete`
**Funkcia:** `delete_image(listing_id, image_id)`

Zmazanie obrázka z inzerátu.

**Vyžaduje:** Prihlásenie, vlastníctvo inzerátu

**Proces:**
1. Kontrola vlastníctva
2. Kontrola príslušnosti obrázka k inzerátu
3. Zmazanie súboru z disku
4. Zmazanie záznamu z databázy

---

### API routes pre správy

#### `GET /api/my-messages`
**Funkcia:** `api_my_messages()`

Získanie všetkých správ používateľa.

**Odpoveď:**
```json
[
  {
    "id": 1,
    "content": "Obsah správy",
    "sender_id": 1,
    "sender_name": "username",
    "receiver_id": 2,
    "receiver_name": "username2",
    "listing_id": 5,
    "listing_title": "Názov inzerátu",
    "created_at": "20.01.2026 14:30",
    "is_read": false,
    "is_sender": true
  }
]
```

---

#### `GET /api/conversations`
**Funkcia:** `api_conversations()`

Získanie zoznamu konverzácií (zoskupené podľa používateľa a inzerátu).

**Logika:**
1. Načítanie všetkých správ používateľa (ako odosielateľ alebo príjemca)
2. Zoskupenie podľa `(other_user_id, listing_id)`
3. Pre každú konverzáciu: posledná správa a počet neprečítaných

**Odpoveď:**
```json
[
  {
    "other_user_id": 2,
    "other_user_name": "username",
    "listing_id": 5,
    "listing_title": "Názov inzerátu",
    "last_message": "Posledná správa...",
    "last_message_time": "20.01.2026 14:30",
    "is_sender": false,
    "unread_count": 3
  }
]
```

---

#### `GET /api/conversation/<other_user_id>` 
#### `GET /api/conversation/<other_user_id>/<listing_id>`
**Funkcia:** `api_conversation(other_user_id, listing_id=None)`

Získanie správ konkrétnej konverzácie.

**Proces:**
1. Filtrovanie správ medzi aktuálnym a druhým používateľom
2. Voliteľne filtrovanie podľa `listing_id`
3. Označenie správ ako prečítané
4. Zoradenie chronologicky

---

#### `POST /api/send-message`
**Funkcia:** `api_send_message()`

Odoslanie správy cez AJAX.

**Request body:**
```json
{
  "receiver_id": 2,
  "listing_id": 5,
  "content": "Text správy"
}
```

---

#### `POST /api/messages/<message_id>/read`
**Funkcia:** `mark_message_as_read(message_id)`

Označenie správy ako prečítanej.

---

#### `GET /api/unread-messages-count`
**Funkcia:** `api_unread_messages_count()`

Počet neprečítaných správ pre notifikačný badge.

**Odpoveď:**
```json
{"count": 5}
```

---

### API routes pre obľúbené

#### `POST /api/favorite/<listing_id>`
**Funkcia:** `api_favorite(listing_id)`

Toggle obľúbeného inzerátu (pridanie/odobratie).

**Odpoveď:**
```json
{
  "success": true,
  "message": "Inzerát bol pridaný do obľúbených.",
  "favorited": true
}
```

---

#### `GET /api/check-favorite/<listing_id>`
**Funkcia:** `check_favorite(listing_id)`

Kontrola, či je inzerát v obľúbených.

**Odpoveď:**
```json
{"is_favorite": true}
```

---

#### `GET /api/my-favorites`
**Funkcia:** `api_my_favorites()`

Zoznam obľúbených inzerátov používateľa.

---

### API routes pre inzeráty

#### `GET /api/my-listings`
**Funkcia:** `api_my_listings()`

Zoznam inzerátov aktuálneho používateľa.

**Odpoveď:**
```json
[
  {
    "id": 1,
    "title": "Názov",
    "description": "Popis",
    "price": 150.0,
    "location": "Bratislava",
    "status": "active",
    "created_at": "20.01.2026",
    "category_name": "Elektronika",
    "image_url": "/static/uploads/image.jpg",
    "has_images": true
  }
]
```

---

### API routes pre zmenu hesla

#### `POST /api/validate-password`
**Funkcia:** `api_validate_password()`

Overenie aktuálneho hesla (pre real-time validáciu).

**Request body:**
```json
{"current_password": "heslo123"}
```

---

#### `POST /api/change-password`
**Funkcia:** `api_change_password()`

Zmena hesla cez AJAX.

**Request body:**
```json
{
  "current_password": "stare_heslo",
  "new_password": "nove_heslo"
}
```

---

## Formuláre

### RegistrationForm
```python
class RegistrationForm(FlaskForm):
    username = StringField('Používateľské meno', 
        validators=[DataRequired(), Length(min=2, max=20)])
    email = StringField('Email', 
        validators=[DataRequired(), Email()])
    password = PasswordField('Heslo', 
        validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Potvrďte heslo', 
        validators=[DataRequired(), EqualTo('password')])
```

### LoginForm
```python
class LoginForm(FlaskForm):
    email = StringField('Email', 
        validators=[DataRequired(), Email()])
    password = PasswordField('Heslo', 
        validators=[DataRequired()])
```

### ListingForm
```python
class ListingForm(FlaskForm):
    title = StringField('Názov', 
        validators=[DataRequired(), Length(max=200)])
    description = TextAreaField('Popis', 
        validators=[DataRequired()])
    price = DecimalField('Cena (€)', 
        validators=[DataRequired(), NumberRange(min=0)])
    location = StringField('Lokalita', 
        validators=[DataRequired(), Length(max=200)])
    category_id = SelectField('Kategória', 
        coerce=int, validators=[DataRequired()])
    images = MultipleFileField('Obrázky')
```

---

## Frontend štruktúra

### JavaScript moduly

#### `messages.js`
Správa konverzácií a správ.

**Hlavné funkcie:**
- `loadConversations()` - Načítanie zoznamu konverzácií
- `openConversation(otherUserId, listingId)` - Otvorenie konverzácie
- `renderMessages(messages)` - Vykreslenie správ
- `sendMessage(event)` - Odoslanie správy
- `updateUnreadCount()` - Aktualizácia počtu neprečítaných

**Event listeners:**
- `shown.bs.tab` na tab "Správy" - načítanie konverzácií
- Auto-refresh každých 30 sekúnd

---

#### `dashboard.js`
Logika pre dashboard.

**Hlavné funkcie:**
- `loadMyListings()` - Načítanie inzerátov používateľa
- `deleteListing(id)` - Zmazanie inzerátu
- `changeListingStatus(id, status)` - Zmena statusu
- `changePassword()` - Zmena hesla

---

#### `favourites.js`
Správa obľúbených inzerátov.

**Hlavné funkcie:**
- `loadFavorites()` - Načítanie obľúbených
- `toggleFavorite(listingId)` - Toggle obľúbeného
- `removeFavorite(listingId)` - Odstránenie z obľúbených

---

#### `search.js`
Rýchle vyhľadávanie na domovskej stránke.

**Hlavné funkcie:**
- Debounced input handler (300ms)
- Fetch na `/api/search`
- Renderovanie výsledkov do `#search-results`

---

### Šablóny (Templates)

#### `base.html`
Základná šablóna s:
- Bootstrap 5 CDN
- Navigačný bar
- Flash messages
- Footer
- Bloky: `title`, `head`, `content`, `scripts`

#### `index.html`
- Rýchle vyhľadávanie
- Štatistiky
- Grid 6 najnovších inzerátov
- Prehľad kategórií

#### `dashboard.html`
Bootstrap tabs:
- Profil
- Moje inzeráty (AJAX)
- Správy (AJAX)
- Obľúbené (AJAX)
- Zmena hesla

#### `listings.html`
- Sidebar s filtrami
- Grid inzerátov
- Stránkovanie

---

## Autentifikácia a autorizácia

### Flask-Login konfigurácia

```python
# app.py
login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.login_message = 'Pre prístup sa musíte prihlásiť.'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
```

### Ochrana routes

```python
@app.route('/dashboard')
@login_required  # Dekorátor vyžaduje prihlásenie
def dashboard():
    ...
```

### Kontrola vlastníctva

```python
if listing.user_id != current_user.id:
    return jsonify({'success': False, 'message': 'Nemáte oprávnenie'}), 403
```

### Hashovanie hesiel

```python
# Nastavenie hesla
def set_password(self, password):
    self.password_hash = generate_password_hash(password)

# Overenie hesla
def check_password(self, password):
    return check_password_hash(self.password_hash, password)
```

---

## Spustenie aplikácie

### Lokálne spustenie

```bash
# 1. Vytvorenie virtuálneho prostredia
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# 2. Inštalácia závislostí
pip install -r requirements.txt

# 3. Inicializácia databázy (ak neexistuje)
python -c "from app import create_app; from extensions import db; app = create_app(); app.app_context().push(); db.create_all()"

# 4. Seed dát (voliteľné)
python seed.py

# 5. Spustenie
python run.py
```

### Docker spustenie

```bash
docker-compose up --build
```

### Premenné prostredia

| Premenná | Popis | Default |
|----------|-------|---------|
| `SECRET_KEY` | Tajný kľúč pre sessions | Hardcoded (zmeniť v produkcii!) |
| `DATABASE_URL` | URL databázy | `sqlite:///instance/data.db` |

---

## Bezpečnosť

### Implementované opatrenia

1. **CSRF ochrana** - Flask-WTF automaticky
2. **Password hashing** - Werkzeug `generate_password_hash`
3. **SQL Injection ochrana** - SQLAlchemy ORM
4. **XSS ochrana** - Jinja2 auto-escaping
5. **File upload validácia** - Kontrola prípony súborov
6. **Autorizácia** - Kontrola vlastníctva pred úpravou/mazaním

### Odporúčania pre produkciu

1. Zmeniť `SECRET_KEY` na náhodný reťazec
2. Použiť HTTPS
3. Nastaviť `DEBUG = False`
4. Použiť produkčnú databázu (PostgreSQL)
5. Implementovať rate limiting
6. Pridať validáciu MIME type pre upload súborov

---

*Dokumentácia vytvorená: 20.01.2026*
