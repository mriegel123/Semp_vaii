// Funkcia na zobrazenie flash správy
function showFlashMessage(message, type = 'info') {
    // Vytvoriť flash message element
    const flashDiv = document.createElement('div');
    flashDiv.className = `alert alert-${type} alert-dismissible fade show`;
    flashDiv.style.position = 'fixed';
    flashDiv.style.top = '20px';
    flashDiv.style.right = '20px';
    flashDiv.style.zIndex = '9999';
    flashDiv.style.minWidth = '300px';
    flashDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Pridať do body
    document.body.appendChild(flashDiv);

    // Automaticky odstrániť po 5 sekundách
    setTimeout(() => {
        if (flashDiv.parentElement) {
            flashDiv.remove();
        }
    }, 5000);
}

// Funkcia pre obľúbené inzeráty (používaná v listings.html)
function toggleFavorite(listingId, buttonElement) {
    const formData = new FormData();
    formData.append('listing_id', listingId);

    // Zmeniť stav tlačidla počas žiadosti
    const originalHTML = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="bi bi-hourglass"></i> Spracovávam...';

    fetch('/toggle-favorite', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        buttonElement.disabled = false;

        if (data.success) {
            if (data.favorited) {
                buttonElement.innerHTML = '<i class="bi bi-heart-fill text-danger"></i> Obľúbené';
                buttonElement.classList.add('active');
                showFlashMessage(data.message, 'success');
            } else {
                buttonElement.innerHTML = '<i class="bi bi-heart"></i> Obľúbené';
                buttonElement.classList.remove('active');
                showFlashMessage(data.message, 'info');
            }
        } else {
            buttonElement.innerHTML = originalHTML;
            showFlashMessage(data.message || 'Chyba pri ukladaní', 'danger');
        }
    })
    .catch(error => {
        console.error('Chyba:', error);
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalHTML;
        showFlashMessage('Chyba pri ukladaní', 'danger');
    });
}

// Inicializácia obľúbených tlačidiel
function initializeFavoriteButtons() {
    // Pre listings.html - tlačidlá s triedou .favorite-btn
    document.querySelectorAll('.favorite-btn').forEach(button => {
        // Odstrániť existujúce event listenery (ak existujú)
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            const listingId = this.dataset.listingId;
            toggleFavorite(listingId, this);
        });
    });

    // Pre listing_detail.html - špecifické tlačidlá
    document.querySelectorAll('[id^="favorite-btn-"]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const listingId = this.dataset.listingId;
            const formData = new FormData();
            formData.append('listing_id', listingId);

            // Zmeniť stav tlačidla počas žiadosti
            const originalHTML = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<i class="bi bi-hourglass"></i> Spracovávam...';

            fetch('/toggle-favorite', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                this.disabled = false;

                if (data.success) {
                    if (data.favorited) {
                        this.innerHTML = '<i class="bi bi-heart-fill"></i> Odstrániť z obľúbených';
                        showFlashMessage(data.message, 'success');
                    } else {
                        this.innerHTML = '<i class="bi bi-heart"></i> Pridať do obľúbených';
                        showFlashMessage(data.message, 'info');
                    }
                } else {
                    this.innerHTML = originalHTML;
                    showFlashMessage(data.message || 'Chyba pri ukladaní', 'danger');
                }
            })
            .catch(error => {
                console.error('Chyba:', error);
                this.disabled = false;
                this.innerHTML = originalHTML;
                showFlashMessage('Chyba pri ukladaní', 'danger');
            });
        });
    });

    // Pre dashboard.html - formuláre na odstránenie z obľúbených
    document.querySelectorAll('.favorite-remove-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const button = this.querySelector('button');

            // Zmeniť stav tlačidla počas žiadosti
            const originalHTML = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="bi bi-hourglass"></i> Spracovávam...';

            fetch(this.action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                button.disabled = false;

                if (data.success) {
                    // Odstrániť kartu inzerátu
                    const card = this.closest('.col-lg-4, .col-md-6');
                    if (card) {
                        card.remove();
                    }

                    // Skontrolovať, či neostali žiadne obľúbené
                    const favoritesContainer = document.getElementById('user-favorites');
                    if (favoritesContainer && favoritesContainer.children.length === 0) {
                        favoritesContainer.innerHTML = `
                            <div class="col-12">
                                <div class="alert alert-info text-center">
                                    <i class="bi bi-heart display-4 mb-3 text-danger"></i>
                                    <h4 class="alert-heading">Zatiaľ nemáte žiadne obľúbené inzeráty</h4>
                                    <p>Prechádzajte inzeráty a pridávajte si do obľúbených tie, ktoré sa vám páčia!</p>
                                    <a href="/listings" class="btn btn-danger mt-2">
                                        <i class="bi bi-search"></i> Prehľadávať inzeráty
                                    </a>
                                </div>
                            </div>
                        `;
                    }

                    showFlashMessage(data.message, 'info');
                } else {
                    button.innerHTML = originalHTML;
                    showFlashMessage(data.message || 'Chyba pri odstraňovaní', 'danger');
                }
            })
            .catch(error => {
                console.error('Chyba:', error);
                button.disabled = false;
                button.innerHTML = originalHTML;
                showFlashMessage('Chyba pri odstraňovaní', 'danger');
            });
        });
    });
}

// Načítanie pri spustení
document.addEventListener('DOMContentLoaded', function() {
    initializeFavoriteButtons();
});