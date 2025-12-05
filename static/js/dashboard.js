// static/js/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Načítanie používateľových inzerátov
    loadUserListings();

    // Formulár na zmenu hesla
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }

    // Real-time validácia hesiel
    const newPasswordInput = document.getElementById('new_password');
    const confirmPasswordInput = document.getElementById('confirm_password');

    if (newPasswordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            validatePasswordMatch();
        });
    }

    // Tab switching
    const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const target = this.getAttribute('href').substring(1);
            if (target === 'listings') {
                loadUserListings();
            }
        });
    });
});

function loadUserListings() {
    fetch('/api/my-listings')
        .then(response => response.json())
        .then(listings => {
            const container = document.getElementById('user-listings');
            if (listings.length === 0) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            Zatiaľ nemáte žiadne inzeráty.
                            <a href="{{ url_for('new_listing') }}" class="alert-link">Pridať prvý inzerát</a>
                        </div>
                    </div>`;
                return;
            }

            let html = '';
            listings.forEach(listing => {
                html += `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${listing.title}</h5>
                            <p class="card-text">
                                <strong>Cena:</strong> ${listing.price} €<br>
                                <strong>Lokalita:</strong> ${listing.location}<br>
                                <strong>Kategória:</strong> ${listing.category_name}<br>
                                <strong>Stav:</strong> <span class="badge bg-${listing.status === 'active' ? 'success' : 'secondary'}">${listing.status}</span>
                            </p>
                            <div class="btn-group">
                                <a href="/listings/${listing.id}/edit" class="btn btn-sm btn-outline-primary">Upraviť</a>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteListing(${listing.id})">Odstrániť</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });

            container.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading listings:', error);
        });
}

function changePassword() {
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const resultDiv = document.getElementById('password-change-result');

    // Reset validácie
    resetValidation();

    // Klient-side validácia
    if (!validatePasswordForm()) {
        return;
    }

    // AJAX request
    fetch('/api/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            resultDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
            // Vyčistiť formulár
            document.getElementById('changePasswordForm').reset();
        } else {
            resultDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;

            // Zobraziť chybu pre konkrétne pole
            if (data.message.includes('Súčasné heslo')) {
                showError('current_password', data.message);
            } else if (data.message.includes('nezhodujú')) {
                showError('confirm_password', data.message);
            }
        }
    })
    .catch(error => {
        resultDiv.innerHTML = `<div class="alert alert-danger">Chyba pri komunikácii so serverom</div>`;
    });
}

function validatePasswordForm() {
    let isValid = true;

    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (!currentPassword) {
        showError('current_password', 'Zadajte súčasné heslo');
        isValid = false;
    }

    if (!newPassword) {
        showError('new_password', 'Zadajte nové heslo');
        isValid = false;
    } else if (newPassword.length < 6) {
        showError('new_password', 'Heslo musí mať aspoň 6 znakov');
        isValid = false;
    }

    if (!confirmPassword) {
        showError('confirm_password', 'Potvrďte nové heslo');
        isValid = false;
    } else if (newPassword !== confirmPassword) {
        showError('confirm_password', 'Heslá sa nezhodujú');
        isValid = false;
    }

    return isValid;
}

function validatePasswordMatch() {
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (confirmPassword && newPassword !== confirmPassword) {
        showError('confirm_password', 'Heslá sa nezhodujú');
    } else {
        clearError('confirm_password');
    }
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '_error');

    field.classList.add('is-invalid');
    if (errorDiv) {
        errorDiv.textContent = message;
    }
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '_error');

    field.classList.remove('is-invalid');
    if (errorDiv) {
        errorDiv.textContent = '';
    }
}

function resetValidation() {
    const fields = ['current_password', 'new_password', 'confirm_password'];
    fields.forEach(fieldId => {
        clearError(fieldId);
    });

    const resultDiv = document.getElementById('password-change-result');
    if (resultDiv) {
        resultDiv.innerHTML = '';
    }
}

// Funkcia pre mazanie inzerátu (globálna)
function deleteListing(listingId) {
    if (!confirm('Naozaj chcete odstrániť tento inzerát?')) {
        return;
    }

    fetch(`/listings/${listingId}/delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Znovu načítať zoznam inzerátov
            loadUserListings();
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting listing:', error);
        alert('Chyba pri odstraňovaní inzerátu');
    });
}