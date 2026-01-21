function deleteListing(listingId) {
    if (confirm('Naozaj chcete odstrániť tento inzerát?')) {
        fetch(`/listings/${listingId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Inzerát bol odstránený');
                window.location.href = document.getElementById('dashboard-url').value;
            } else {
                alert('Chyba pri odstraňovaní: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Chyba:', error);
            alert('Chyba pri odstraňovaní inzerátu');
        });
    }
}

// Inicializácia carousel a thumbnail interakcie
document.addEventListener('DOMContentLoaded', function() {
    // Inicializácia carousel
    var carousel = document.getElementById('listingCarousel');
    if (carousel) {
        var bsCarousel = new bootstrap.Carousel(carousel);
    }

    // Interakcia thumbnailov
    document.querySelectorAll('.thumbnail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Odstrániť active class zo všetkých
            document.querySelectorAll('.thumbnail-btn').forEach(b => {
                b.classList.remove('active');
            });
            // Pridať active class kliknutému
            this.classList.add('active');
        });
    });

    // Pridanie skrytého inputu pre URL
    var hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'dashboard-url';
    hiddenInput.value = document.body.getAttribute('data-dashboard-url') || '/dashboard';
    document.body.appendChild(hiddenInput);
});