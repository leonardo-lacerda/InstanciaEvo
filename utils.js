// utils.js - Funções utilitárias e helpers
const Utils = {
    // Geradores de ID
    generateInstanceId() {
        return 'inst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    },
    
    generateToken() {
        return Array.from({length: 32}, () => Math.random().toString(36)[2]).join('');
    },
    
    // Validações
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    isValidPhone(phone) {
        const phoneRegex = /^\d{10,15}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    },
    
    // Formatação
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    formatDate(dateString) {
        if (!dateString) return 'Nunca';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMinutes = Math.floor((now - date) / 1000 / 60);
            
            if (diffMinutes < 1) return 'Agora mesmo';
            if (diffMinutes < 60) return `${diffMinutes} min atrás`;
            if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h atrás`;
            
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return 'Data inválida';
        }
    },
    
    formatPrice(price) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    },
    
    formatDuration(minutes) {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    },
    
    // Status helpers
    getStatusColor(status) {
        const colors = {
            'disconnected': '#e74c3c',
            'waiting_qr': '#f39c12',
            'connected': '#27ae60',
            'creating': '#3498db',
            'error': '#e74c3c'
        };
        return colors[status] || '#666';
    },
    
    getStatusText(status) {
        const texts = {
            'disconnected': 'Desconectado',
            'waiting_qr': 'Aguardando QR',
            'connected': 'Conectado',
            'creating': 'Criando...',
            'error': 'Erro'
        };
        return texts[status] || 'Desconhecido';
    },
    
    // Toast notifications
    showToast(message, type = 'success') {
        // Remove toast existente se houver
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Cria novo toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Mostra o toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Remove o toast após o tempo configurado
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, CONFIG.TOAST_DURATION);
    },
    
    // Download de arquivos
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },
    
    downloadText(text, filename) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },
    
    // QR Code mock (para desenvolvimento)
    generateMockQRCode() {
        const qrTexts = [
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==',
            'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        ];
        return qrTexts[Math.floor(Math.random() * qrTexts.length)];
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Copy to clipboard
    copyToClipboard(text) {
        return navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copiado para a área de transferência!', 'success');
            return true;
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            this.showToast('Erro ao copiar. Tente novamente.', 'error');
            return false;
        });
    },
    
    // Sanitize input
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/[<>'"]/g, '');
    },
    
    // Format phone number
    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },
    
    // Check if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    // Storage helpers
    setStorageItem(key, value, expiration = null) {
        const item = {
            value: value,
            timestamp: Date.now(),
            expiration: expiration
        };
        try {
            localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            return false;
        }
    },
    
    getStorageItem(key) {
        try {
            const item = JSON.parse(localStorage.getItem(key));
            if (!item) return null;
            
            if (item.expiration && Date.now() > item.expiration) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            console.error('Erro ao ler do localStorage:', error);
            return null;
        }
    },
    
    // Network status
    isOnline() {
        return navigator.onLine;
    },
    
    // Device detection
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Error handling
    handleError(error, context = '') {
        console.error(`Erro${context ? ` em ${context}` : ''}:`, error);
        
        let message = 'Ocorreu um erro inesperado';
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        
        this.showToast(message, 'error');
    },
    
    // Promise timeout wrapper
    withTimeout(promise, timeoutMs) {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        );
        
        return Promise.race([promise, timeout]);
    }
};

// Exportar utilitários
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}