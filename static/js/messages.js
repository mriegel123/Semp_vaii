// messages.js

let currentConversation = null;
let refreshInterval = null;

// Načítanie konverzácií
function loadConversations() {
    const loadingElement = document.getElementById('messages-loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }

    fetch('/api/conversations')
        .then(response => response.json())
        .then(conversations => {
            const container = document.getElementById('conversations-list');

            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            if (conversations.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-envelope me-2"></i>
                        Zatiaľ nemáte žiadne správy.
                    </div>
                `;
                return;
            }

            let htmlContent = '';
            conversations.forEach(conv => {
                const hasUnread = conv.unread_count > 0;
                htmlContent += `
                    <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-start conversation-item ${hasUnread ? 'border-start border-danger border-3' : ''}"
                       onclick="openConversation(${conv.other_user_id}, ${conv.listing_id || 'null'})">
                        <div class="me-auto">
                            <div class="fw-bold">${conv.other_user_name}</div>
                            <small class="text-muted">${conv.listing_title || 'Všeobecná konverzácia'}</small>
                            <div class="text-truncate mt-1" style="max-width: 200px;">
                                ${conv.is_sender ? '<i class="bi bi-arrow-right me-1"></i>' : ''}
                                ${conv.last_message}
                            </div>
                        </div>
                        <div class="text-end">
                            <small class="text-muted d-block">${conv.last_message_time}</small>
                            ${hasUnread ? `<span class="badge bg-danger rounded-pill">${conv.unread_count}</span>` : ''}
                        </div>
                    </a>
                `;
            });

            container.innerHTML = htmlContent;
            updateUnreadCount();
        })
        .catch(error => {
            console.error('Chyba pri načítaní konverzácií:', error);
            const container = document.getElementById('conversations-list');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Chyba pri načítaní konverzácií.
                    </div>
                `;
            }
        });
}

// Otvorenie konverzácie
function openConversation(otherUserId, listingId) {
    currentConversation = { otherUserId, listingId };

    // Zobraziť indikátor načítania
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Načítavam...</span>
            </div>
        </div>
    `;

    // Skryť "žiadna konverzácia" a zobraziť konverzáciu
    document.getElementById('no-conversation-selected').style.display = 'none';
    document.getElementById('conversation-container').style.display = 'block';

    // Načítať správy
    const url = listingId && listingId !== 'null'
        ? `/api/conversation/${otherUserId}/${listingId}`
        : `/api/conversation/${otherUserId}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Aktualizovať nadpis
            document.getElementById('conversation-title').textContent =
                `Konverzácia s ${data.other_user.username}`;
            document.getElementById('conversation-subtitle').textContent =
                data.listing ? `Inzerát: ${data.listing.title}` : 'Všeobecná konverzácia';

            // Nastaviť skryté polia pre odpoveď
            document.getElementById('conversation-user-id').value = otherUserId;
            document.getElementById('conversation-listing-id').value = listingId !== 'null' ? listingId : '';

            // Zobraziť správy
            renderMessages(data.messages);

            // Obnoviť zoznam konverzácií (pre aktualizáciu počtu neprečítaných)
            loadConversations();
        })
        .catch(error => {
            console.error('Chyba pri načítaní konverzácie:', error);
            messagesContainer.innerHTML = `
                <div class="alert alert-danger">
                    Chyba pri načítaní konverzácie.
                </div>
            `;
        });
}

// Zobrazenie správ
function renderMessages(messages) {
    const container = document.getElementById('messages-container');

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                Žiadne správy. Začnite konverzáciu!
            </div>
        `;
        return;
    }

    let htmlContent = '';
    messages.forEach(msg => {
        const isSender = msg.is_sender;
        htmlContent += `
            <div class="d-flex mb-3 ${isSender ? 'justify-content-end' : 'justify-content-start'}">
                <div class="card ${isSender ? 'bg-primary text-white' : 'bg-light'}" style="max-width: 80%;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <small class="${isSender ? 'text-white-50' : 'text-muted'}">
                                ${isSender ? 'Vy' : msg.sender_name}
                            </small>
                            <small class="${isSender ? 'text-white-50' : 'text-muted'} ms-2">
                                ${msg.created_at}
                            </small>
                        </div>
                        <p class="card-text mb-0">${msg.content}</p>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlContent;
    // Posunúť sa na poslednú správu
    container.scrollTop = container.scrollHeight;
}

// Odoslanie správy
function sendMessage(event) {
    event.preventDefault();

    const otherUserId = document.getElementById('conversation-user-id').value;
    const listingId = document.getElementById('conversation-listing-id').value;
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();

    if (!content || !otherUserId) {
        return;
    }

    const data = {
        receiver_id: parseInt(otherUserId),
        listing_id: listingId ? parseInt(listingId) : null,
        content: content
    };

    fetch('/api/send-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Vymazať vstup
            messageInput.value = '';

            // Znovu načítať konverzáciu (pridá novú správu)
            openConversation(currentConversation.otherUserId, currentConversation.listingId);
        } else {
            alert('Chyba: ' + result.message);
        }
    })
    .catch(error => {
        console.error('Chyba pri odosielaní správy:', error);
        alert('Chyba pri odosielaní správy');
    });
}

// Zatvorenie konverzácie
function closeConversation() {
    currentConversation = null;
    document.getElementById('conversation-container').style.display = 'none';
    document.getElementById('no-conversation-selected').style.display = 'block';
}

// Aktualizácia počtu neprečítaných správ
function updateUnreadCount() {
    fetch('/api/unread-messages-count')
        .then(response => response.json())
        .then(data => {
            const badge = document.getElementById('unread-count');
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline';
                } else {
                    badge.style.display = 'none';
                }
            }
        })
        .catch(error => console.error('Chyba pri aktualizácii počtu správ:', error));
}

// Inicializácia
document.addEventListener('DOMContentLoaded', function() {
    // Auto-refresh konverzácií každých 30 sekúnd
    refreshInterval = setInterval(() => {
        const messagesTab = document.getElementById('messages');
        if (messagesTab && (messagesTab.classList.contains('active') || messagesTab.classList.contains('show'))) {
            loadConversations();
        }
        updateUnreadCount();
    }, 30000);

    // Načítanie počtu neprečítaných správ pri načítaní stránky
    updateUnreadCount();
});

// Funkcia na zastavenie refresh intervalu (volať pri odchode zo stránky)
function stopMessagesRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}