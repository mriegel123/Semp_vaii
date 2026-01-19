// Funkcia na zobrazenie správy
function showMessage(message, type = 'success') {
    // Vytvoriť element správy
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Vložiť správu na začiatok obsahovej časti
    const contentSection = document.querySelector('.row.justify-content-center');
    if (contentSection) {
        contentSection.insertBefore(alertDiv, contentSection.firstChild);

        // Automaticky odstrániť po 5 sekundách
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Funkcia na mazanie obrázka pomocou AJAX
function deleteImage(imageId, listingId) {
    if (!confirm('Naozaj chcete odstrániť tento obrázok?')) {
        return;
    }

    const deleteButton = document.querySelector(`button[data-image-id="${imageId}"]`);
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.innerHTML = '<i class="bi bi-hourglass"></i>';
    }

    fetch(`/listings/${listingId}/images/${imageId}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Chyba pri odstraňovaní obrázka');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Odstrániť obrázok z DOM
            const imageElement = document.getElementById(`image-${imageId}`);
            if (imageElement) {
                imageElement.remove();
            }

            // Zobraziť správu o úspechu
            showMessage('Obrázok bol úspešne odstránený', 'success');

            // Ak neostali žiadne obrázky, zobraziť upozornenie
            const existingImages = document.getElementById('existing-images-container');
            if (existingImages && existingImages.children.length === 0) {
                existingImages.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            Žiadne obrázky
                        </div>
                    </div>
                `;
            }
        } else {
            showMessage(data.message || 'Chyba pri odstraňovaní obrázka', 'danger');
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
            }
        }
    })
    .catch(error => {
        console.error('Chyba pri mazaní obrázka:', error);
        showMessage('Chyba pri odstraňovaní obrázka', 'danger');
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
        }
    });
}

// Inicializácia po načítaní DOM
document.addEventListener('DOMContentLoaded', function() {
    // Pridanie event listenerov pre všetky tlačidlá na mazanie obrázkov
    document.addEventListener('click', function(event) {
        if (event.target.closest('.delete-image-btn')) {
            const button = event.target.closest('.delete-image-btn');
            const imageId = button.getAttribute('data-image-id');
            const listingId = button.getAttribute('data-listing-id');
            deleteImage(imageId, listingId);
        }
    });
});