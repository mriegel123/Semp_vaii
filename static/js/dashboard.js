
// --- 1. CORE FUNCTIONS (Load Listings, Delete Listing) ---

function loadUserListings() {
    const loadingElement = document.getElementById('listings-loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }

    fetch('/api/my-listings')
        .then(response => response.json())
        .then(listings => {
            const container = document.getElementById('user-listings');
            let htmlContent = '';

            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            if (listings.length === 0) {
                htmlContent = `
                    <div class="col-12">
                        <div class="alert alert-info text-center">
                            <i class="bi bi-info-circle display-4 mb-3"></i>
                            <h4 class="alert-heading">Zatiaľ nemáte žiadne inzeráty</h4>
                            <p>Začnite predávať na Trhovisku!</p>
                            <a href="/listings/new" class="btn btn-success mt-2">
                                <i class="bi bi-plus-circle"></i> Pridať prvý inzerát
                            </a>
                        </div>
                    </div>
                `;
            } else {
                listings.forEach(listing => {
                    // Použite skutočný obrázok alebo placeholder
                    let imageUrl = listing.image_url;
                    if (!imageUrl) {
                        // Použite placeholder s textom z titulu
                        const placeholderText = encodeURIComponent(listing.title.substring(0, 15));
                        imageUrl = `https://via.placeholder.com/300x200/6c757d/ffffff?text=${placeholderText}`;
                    }

                    const priceFormatted = listing.price ? `${listing.price} €` : 'Dohodou';
                    const createdAt = listing.created_at || 'Nedátované';

                    // Bezpečne získať popis (ak existuje)
                    const description = listing.description || 'Bez popisu';
                    const shortDescription = description.length > 100 ? description.substring(0, 100) + '...' : description;

                    // Určiť farbu badge podľa statusu
                    let statusBadgeClass = 'bg-secondary';
                    let statusText = 'Neznámy';

                    switch(listing.status) {
                        case 'active':
                            statusBadgeClass = 'bg-success';
                            statusText = 'Aktívny';
                            break;
                        case 'sold':
                            statusBadgeClass = 'bg-danger';
                            statusText = 'Predaný';
                            break;
                        case 'expired':
                            statusBadgeClass = 'bg-warning';
                            statusText = 'Expirovaný';
                            break;
                    }

                    htmlContent += `
                        <div class="col-lg-4 col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="position-relative">
                                    <img src="${imageUrl}" 
                                         class="card-img-top img-thumbnail" 
                                         alt="${listing.title}" 
                                         style="height: 200px; object-fit: cover;">
                                    <span class="position-absolute top-0 start-0 m-2 badge ${statusBadgeClass}">
                                        ${statusText}
                                    </span>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title">${listing.title}</h5>
                                    <p class="card-text text-muted small">
                                        <i class="bi bi-geo-alt"></i> ${listing.location || 'Neuvedené'}
                                    </p>
                                    <p class="card-text">${shortDescription}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="h5 text-primary mb-0">${priceFormatted}</span>
                                        <small class="text-muted">
                                            <i class="bi bi-calendar"></i> ${createdAt}
                                        </small>
                                    </div>
                                    <p class="mt-2 mb-1">
                                        <span class="badge bg-info">
                                            <i class="bi bi-tag"></i> ${listing.category_name || 'Bez kategórie'}
                                        </span>
                                    </p>
                                </div>
                                <div class="card-footer bg-transparent d-flex justify-content-between">
                                    <a href="/listings/${listing.id}" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-eye"></i> Zobraziť
                                    </a>
                                    <div>
                                        <a href="/listings/${listing.id}/edit" class="btn btn-sm btn-warning me-1">
                                            <i class="bi bi-pencil"></i> Upraviť
                                        </a>
                                        <button onclick="deleteListing(${listing.id})" class="btn btn-sm btn-danger">
                                            <i class="bi bi-trash"></i> Odstrániť
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            if (container) {
                container.innerHTML = htmlContent;
            }
        })
        .catch(error => {
            console.error('Chyba pri načítaní inzerátov:', error);
            const container = document.getElementById('user-listings');
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger text-center">
                            <i class="bi bi-exclamation-triangle display-4 mb-3"></i>
                            <h4 class="alert-heading">Chyba pri načítaní inzerátov</h4>
                            <p>Skúste znova neskôr alebo obnovte stránku.</p>
                            <button onclick="loadUserListings()" class="btn btn-outline-danger mt-2">
                                <i class="bi bi-arrow-clockwise"></i> Skúsiť znova
                            </button>
                        </div>
                    </div>
                `;
            }

            const loadingElement = document.getElementById('listings-loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
}

// Funkcia pre mazanie inzerátu
function deleteListing(listingId) {
    if (!confirm('Naozaj chcete odstrániť tento inzerát?')) {
        return;
    }

    fetch(`/listings/${listingId}/delete`, {  // Zmenené z /api/listings/ na /listings/
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Chyba pri odstraňovaní inzerátu');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert(data.message || 'Inzerát bol úspešne odstránený.');
            // Znovu načítať inzeráty po úspešnom zmazaní
            loadUserListings();
        } else {
            alert(data.message || 'Chyba pri odstraňovaní inzerátu.');
        }
    })
    .catch(error => {
        console.error('Chyba pri mazaní inzerátu:', error);
        alert('Chyba pri odstraňovaní inzerátu.');
    });
}


// --- 2. VALIDATION HELPERS ---

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '_error');

    if (field) field.classList.add('is-invalid');
    if (errorDiv) {
        errorDiv.textContent = message;
    }
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '_error');

    if (field) field.classList.remove('is-invalid');
    if (errorDiv) {
        errorDiv.textContent = '';
    }
}

function resetValidation() {
    const fields = ['current_password', 'new_password', 'confirm_password'];
    fields.forEach(fieldId => {
        clearError(fieldId);
    });
}


// --- 3. PASSWORD CHANGE LOGIC (VALIDATION + AJAX) ---

/**
 * Vykoná klientskú validáciu polí Nové heslo a Potvrdenie nového hesla.
 * Kontroluje minimálnu dĺžku (6 znakov) a zhodu hesiel.
 * Zobrazuje chyby priamo pod poľami.
 * @returns {boolean} True, ak je validácia úspešná, inak False.
 */
function validatePasswords() {
    let isValid = true;
    const newPasswordInput = document.getElementById('new_password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const MIN_LENGTH = 6;

    // Najprv vyčistíme chyby na poliach
    clearError('new_password');
    clearError('confirm_password');

    // 1. Kontrola dĺžky nového hesla
    if (newPassword.length < MIN_LENGTH) {
        showError('new_password', `Nové heslo musí mať minimálne ${MIN_LENGTH} znakov.`);
        isValid = false;
    }

    // 2. Kontrola zhody hesiel
    // Spúšťame len ak obe polia obsahujú text (ináč by pri každom písmenku zobrazovalo chybu nezhody)
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        showError('confirm_password', 'Nové heslo a potvrdenie sa nezhodujú.');
        isValid = false;
    }

    // Ak je potvrdenie hesla zadané, ale je príliš krátke (a nové heslo už dĺžkou prešlo)
    if (confirmPassword && confirmPassword.length < MIN_LENGTH && newPassword.length >= MIN_LENGTH) {
         showError('confirm_password', `Potvrdenie hesla musí mať minimálne ${MIN_LENGTH} znakov.`);
        isValid = false;
    }


    return isValid;
}

function changePassword() {
    const form = document.getElementById('changePasswordForm');
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const resultDiv = document.getElementById('password-change-result');
    resultDiv.innerHTML = '';
    resetValidation();

    // Kontrola, či je zadané aktuálne heslo
    if (!currentPassword) {
        showError('current_password', 'Zadajte svoje súčasné heslo.');
        resultDiv.innerHTML = '<div class="alert alert-warning">Prosím, skontrolujte chyby vo formulári.</div>';
        return;
    }

    // 1. Spustiť klientskú validáciu pred odoslaním
    if (!validatePasswords()) {
        resultDiv.innerHTML = '<div class="alert alert-warning">Prosím, opravte chyby v novom hesle.</div>';
        return;
    }

    // 2. Odoslanie dát na server (AJAX)
    fetch('/api/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
        }),
    })
    .then(async response => {
        const data = await response.json();
        if (response.ok) {
            return data;
        }
        // Spracovanie chýb so statusom 4xx/5xx
        throw data;
    })
    .then(data => {
        // Úspech (status 200)
        resultDiv.innerHTML = `<div class="alert alert-success">${data.message || 'Heslo bolo úspešne zmenené.'}</div>`;
        form.reset(); // Vyčistiť formulár po úspechu
        resetValidation();
    })
    .catch(errorData => {
        // Chyby zo servera (napr. zlé heslo, krátke heslo, ktoré prešlo validáciou predtým ako server-side chyba)
        const errorMessage = errorData.message || 'Chyba pri zmene hesla (neznáma chyba).';
        resultDiv.innerHTML = `<div class="alert alert-danger">${errorMessage}</div>`;

        // Zobrazenie chyby pri konkrétnom poli, ak je v odpovedi (ako sme implementovali v run.py)
        if (errorData.field) {
            showError(errorData.field, errorMessage);
        }
    });
}
// Funkcia na načítanie obľúbených inzerátov
function loadUserFavorites() {
    const loadingElement = document.getElementById('favorites-loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }

    fetch('/api/my-favorites')
        .then(response => response.json())
        .then(listings => {
            const container = document.getElementById('user-favorites');
            let htmlContent = '';

            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            if (listings.length === 0) {
                htmlContent = `
                    <div class="col-12">
                        <div class="alert alert-info text-center">
                            <i class="bi bi-heart display-4 mb-3 text-danger"></i>
                            <h4 class="alert-heading">Zatiaľ nemáte žiadne obľúbené inzeráty</h4>
                            <p>Prechádzajte inzeráty a pridávajte si do obľúbených tie, ktoré sa vám páčia!</p>
                            <a href="{{ url_for('listings') }}" class="btn btn-danger mt-2">
                                <i class="bi bi-search"></i> Prehľadávať inzeráty
                            </a>
                        </div>
                    </div>
                `;
            } else {
                listings.forEach(listing => {
                    // Použite skutočný obrázok alebo placeholder
                    let imageUrl = listing.image_url;
                    if (!imageUrl) {
                        // Použite placeholder s textom z titulu
                        const placeholderText = encodeURIComponent(listing.title.substring(0, 15));
                        imageUrl = `https://via.placeholder.com/300x200/6c757d/ffffff?text=${placeholderText}`;
                    }

                    const priceFormatted = listing.price ? `${listing.price} €` : 'Dohodou';
                    const createdAt = listing.created_at || 'Nedátované';

                    // Bezpečne získať popis (ak existuje)
                    const description = listing.description || 'Bez popisu';
                    const shortDescription = description.length > 100 ? description.substring(0, 100) + '...' : description;

                    // Určiť farbu badge podľa statusu
                    let statusBadgeClass = 'bg-secondary';
                    let statusText = 'Neznámy';

                    switch(listing.status) {
                        case 'active':
                            statusBadgeClass = 'bg-success';
                            statusText = 'Aktívny';
                            break;
                        case 'sold':
                            statusBadgeClass = 'bg-danger';
                            statusText = 'Predaný';
                            break;
                        case 'expired':
                            statusBadgeClass = 'bg-warning';
                            statusText = 'Expirovaný';
                            break;
                    }

                    htmlContent += `
                        <div class="col-lg-4 col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="position-relative">
                                    <img src="${imageUrl}" 
                                         class="card-img-top img-thumbnail" 
                                         alt="${listing.title}" 
                                         style="height: 200px; object-fit: cover;">
                                    <span class="position-absolute top-0 start-0 m-2 badge ${statusBadgeClass}">
                                        ${statusText}
                                    </span>
                                    <span class="position-absolute top-0 end-0 m-2 heart-favorite">
                                        <i class="bi bi-heart-fill fs-4 text-danger"></i>
                                    </span>
                                </div>
                                <div class="card-body">
                                    <h5 class="card-title">${listing.title}</h5>
                                    <p class="card-text text-muted small">
                                        <i class="bi bi-geo-alt"></i> ${listing.location || 'Neuvedené'}
                                    </p>
                                    <p class="card-text">${shortDescription}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="h5 text-primary mb-0">${priceFormatted}</span>
                                        <small class="text-muted">
                                            <i class="bi bi-person"></i> ${listing.author}
                                        </small>
                                    </div>
                                    <p class="mt-2 mb-1">
                                        <span class="badge bg-info">
                                            <i class="bi bi-tag"></i> ${listing.category_name || 'Bez kategórie'}
                                        </span>
                                        <small class="text-muted ms-2">
                                            <i class="bi bi-calendar"></i> ${createdAt}
                                        </small>
                                    </p>
                                </div>
                                <div class="card-footer bg-transparent d-flex justify-content-between">
                                    <a href="/listings/${listing.id}" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-eye"></i> Zobraziť
                                    </a>
                                    <form method="POST" action="/toggle-favorite" class="d-inline">
                                        <input type="hidden" name="listing_id" value="${listing.id}">
                                        <button type="submit" class="btn btn-sm btn-outline-danger">
                                            <i class="bi bi-heart-fill"></i> Odobrať z obľúbených
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            if (container) {
                container.innerHTML = htmlContent;

                // Pridanie event listenerov pre formuláre na odstránenie z obľúbených
                container.querySelectorAll('form').forEach(form => {
                    form.addEventListener('submit', function(e) {
                        e.preventDefault();
                        removeFromFavorites(this);
                    });
                });
            }
        })
        .catch(error => {
            console.error('Chyba pri načítaní obľúbených inzerátov:', error);
            const container = document.getElementById('user-favorites');
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger text-center">
                            <i class="bi bi-exclamation-triangle display-4 mb-3"></i>
                            <h4 class="alert-heading">Chyba pri načítaní obľúbených inzerátov</h4>
                            <p>Skúste znova neskôr alebo obnovte stránku.</p>
                            <button onclick="loadUserFavorites()" class="btn btn-outline-danger mt-2">
                                <i class="bi bi-arrow-clockwise"></i> Skúsiť znova
                            </button>
                        </div>
                    </div>
                `;
            }

            const loadingElement = document.getElementById('favorites-loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });
}

// Funkcia na odstránenie z obľúbených
function removeFromFavorites(form) {
    const formData = new FormData(form);
    const listingId = formData.get('listing_id');

    fetch('/toggle-favorite', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.redirected) {
            // Flask vráti redirect, musíme znova načítať obľúbené
            loadUserFavorites();
        }
        return response.text();
    })
    .then(() => {
        // Po úspešnom odstránení znova načítať obľúbené
        loadUserFavorites();
    })
    .catch(error => {
        console.error('Chyba pri odstraňovaní z obľúbených:', error);
        alert('Chyba pri odstraňovaní z obľúbených');
    });
}

// --- 4. DOM READY LOGIC ---

document.addEventListener('DOMContentLoaded', function() {
    // Načítanie používateľových inzerátov
    const listingsTab = document.getElementById('listings');
    if (listingsTab) {
        loadUserListings();
    }

    // Tab switching (pre načítanie inzerátov, keď je tab aktivovaný)
    const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const target = this.getAttribute('href').substring(1);
            if (target === 'listings') {
                loadUserListings();
            } else if (target === 'favorites') {
                loadUserFavorites();
            } else if (target === 'change-password') {
                // Vyčistíme formulár a chyby pri prepnutí na tab
                const changePasswordForm = document.getElementById('changePasswordForm');
                if (changePasswordForm) {
                    changePasswordForm.reset();
                    resetValidation();
                    const resultDiv = document.getElementById('password-change-result');
                    if(resultDiv) resultDiv.innerHTML = '';
                }
            }
        });
    });

    // Spracovanie formulára pre zmenu hesla
    const changePasswordForm = document.getElementById('changePasswordForm');
    const newPasswordInput = document.getElementById('new_password');
    const confirmPasswordInput = document.getElementById('confirm_password');

    if (changePasswordForm) {
        // Pridanie 'live' validácie na zmenu hesla a potvrdenie
        if (newPasswordInput && confirmPasswordInput) {
            const liveValidate = () => {
                validatePasswords();
            };
            newPasswordInput.addEventListener('input', liveValidate);
            confirmPasswordInput.addEventListener('input', liveValidate);
        }

        // Spracovanie submitu
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }
});