// config.js - Configurações centralizadas da aplicação
const CONFIG = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'admin123',
    EVOLUTION_API_URL: 'https://promptaaievo.discloud.app',
    EVOLUTION_API_KEY: 'X7mR4qP2tH9bW6zC',
    
    // Configurações de backup
    BACKUP_INTERVAL: 5 * 60 * 1000, // 5 minutos
    HEALTH_CHECK_INTERVAL: 2 * 60 * 1000, // 2 minutos
    
    // Configurações de mensagens
    MAX_MESSAGES_PER_INSTANCE: 100,
    MAX_MESSAGES_IN_HISTORY: 1000,
    
    // Configurações de interface
    TOAST_DURATION: 4000,
    QR_REFRESH_INTERVAL: 30000,
    
    // Versão da aplicação
    VERSION: '1.0.0'
};

// Exportar configurações
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}