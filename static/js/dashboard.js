
// --- 1. CORE FUNCTIONS (Load Listings, Delete Listing) ---

function loadUserListings() {
    fetch('/api/my-listings')
        .then(response => response.json())
        .then(listings => {
            const container = document.getElementById('user-listings');
            let htmlContent = '';

            if (listings.length === 0) {
                htmlContent = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            Zatiaľ nemáte žiadne inzeráty.
                            <a href="/listings/new" class="alert-link">Pridať prvý inzerát</a>
                        </div>
                    </div>
                `;
            } else {
                listings.forEach(listing => {
                    // Použite placeholder, keďže nemáme skutočné obrázky
                    const imageUrl = 'https://via.placeholder.com/300x200/6c757d/ffffff?text=' + encodeURIComponent(listing.title.substring(0, 15));
                    const priceFormatted = listing.price ? `${listing.price} €` : 'Dohodou';
                    const createdAt = listing.created_at || 'Nedátované';

                    // Bezpečne získať popis (ak existuje)
                    const description = listing.description || 'Bez popisu';
                    const shortDescription = description.length > 70 ? description.substring(0, 70) + '...' : description;

                    htmlContent += `
                        <div class="col-lg-4 col-md-6 mb-4">
                            <div class="card h-100">
                                <img src="${imageUrl}" class="card-img-top" alt="${listing.title}" style="height: 200px; object-fit: cover;">
                                <div class="card-body">
                                    <h5 class="card-title">${listing.title}</h5>
                                    <p class="card-text">${shortDescription}</p>
                                    <p class="fw-bold text-primary">${priceFormatted}</p>
                                    <p class="text-muted">
                                        <small>
                                            ${listing.location || 'Neuvedené'} • 
                                            ${listing.category_name || 'Bez kategórie'} • 
                                            ${createdAt}
                                        </small>
                                    </p>
                                    <p><span class="badge bg-${listing.status === 'active' ? 'success' : 'secondary'}">${listing.status}</span></p>
                                </div>
                                <div class="card-footer d-flex justify-content-between">
                                    <a href="/listings/${listing.id}/edit" class="btn btn-warning btn-sm">Upraviť</a>
                                    <button onclick="deleteListing(${listing.id})" class="btn btn-danger btn-sm">Odstrániť</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            if (container) {
                container.innerHTML = `<div class="row">${htmlContent}</div>`;
            }
        })
        .catch(error => {
            console.error('Chyba pri načítaní inzerátov:', error);
            const container = document.getElementById('user-listings');
            if (container) {
                 container.innerHTML = '<div class="col-12"><div class="alert alert-danger">Chyba pri načítaní inzerátov. Skúste znova neskôr.</div></div>';
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