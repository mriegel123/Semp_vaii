// Funkcia pre odstránenie inzerátu
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
                window.location.href = '/dashboard';
            } else {
                alert('Chyba pri odstraňovaní: ' + data.message);
            }
        });
    }
}

// Správa thumbnail galérie
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.getElementById('listingCarousel');
    const thumbnailButtons = document.querySelectorAll('.thumbnail-btn');

    if (carousel && thumbnailButtons.length > 0) {
        const carouselInstance = new bootstrap.Carousel(carousel, {
            interval: false, // Vypnuté automatické prehrávanie
            wrap: true
        });

        // Pri zmene slide aktualizovať aktívny thumbnail
        carousel.addEventListener('slid.bs.carousel', function(event) {
            const activeIndex = event.to;

            // Odstrániť aktívny štýl zo všetkých thumbnails
            thumbnailButtons.forEach(btn => {
                btn.classList.remove('active', 'border-primary');
                btn.classList.add('border-secondary');
            });

            // Pridať aktívny štýl aktuálnemu thumbnailu
            if (thumbnailButtons[activeIndex]) {
                thumbnailButtons[activeIndex].classList.add('active', 'border-primary');
                thumbnailButtons[activeIndex].classList.remove('border-secondary');
            }
        });

        // Nastaviť aktívny štýl pre prvý thumbnail
        if (thumbnailButtons[0]) {
            thumbnailButtons[0].classList.add('active', 'border-primary');
            thumbnailButtons[0].classList.remove('border-secondary');
        }

        // Pridanie hover efektu pre thumbnails
        thumbnailButtons.forEach(btn => {
            const img = btn.querySelector('img');
            if (img) {
                btn.addEventListener('mouseenter', function() {
                    img.style.transform = 'scale(1.05)';
                    img.style.transition = 'transform 0.2s ease';
                });

                btn.addEventListener('mouseleave', function() {
                    img.style.transform = 'scale(1)';
                });
            }
        });
    }

    // Inicializácia carousel ak existuje
    if (carousel) {
        new bootstrap.Carousel(carousel);
    }
});