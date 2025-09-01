// evolution-api.js - Cliente para integração com a Evolution API
class EvolutionAPI {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
        };
    }
    
    // Método base para fazer requisições
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...(options.headers || {}) },
            ...options
        };
        
        try {
            const response = await Utils.withTimeout(
                fetch(url, config),
                10000 // 10 segundos de timeout
            );
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        } catch (error) {
            console.error(`Erro na requisição para ${endpoint}:`, error);
            throw error;
        }
    }
    
    // Criar nova instância
    async createInstance(instanceName) {
        try {
            Utils.showToast('Criando instância na Evolution API...', 'info');
            
            const data = await this.makeRequest('/instance/create', {
                method: 'POST',
                body: JSON.stringify({
                    instanceName: instanceName,
                    integration: 'WHATSAPP-BAILEYS'
                })
            });
            
            Utils.showToast('Instância criada com sucesso na Evolution API!', 'success');
            return data;
        } catch (error) {
            Utils.showToast(`Erro ao criar instância: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // Obter QR Code para conexão
    async getQRCode(instanceName) {
        try {
            const data = await this.makeRequest(`/instance/connect/${instanceName}`, {
                method: 'GET'
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao obter QR Code:', error);
            throw new Error(`Falha ao obter QR Code: ${error.message}`);
        }
    }
    
    // Deletar instância
    async deleteInstance(instanceName) {
        try {
            const data = await this.makeRequest(`/instance/delete/${instanceName}`, {
                method: 'DELETE'
            });
            
            Utils.showToast('Instância removida da Evolution API', 'info');
            return data;
        } catch (error) {
            Utils.showToast(`Erro ao deletar instância: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // Configurar webhook
    async setWebhook(instanceName, webhookUrl) {
        try {
            const data = await this.makeRequest(`/webhook/set/${instanceName}`, {
                method: 'POST',
                body: JSON.stringify({
                    url: webhookUrl,
                    enabled: true,
                    events: [
                        'APPLICATION_STARTUP',
                        'QRCODE_UPDATED',
                        'CONNECTION_UPDATE',
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'SEND_MESSAGE'
                    ]
                })
            });
            
            Utils.showToast('Webhook configurado com sucesso!', 'success');
            return data;
        } catch (error) {
            Utils.showToast(`Erro ao configurar webhook: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // Enviar mensagem de texto
    async sendTextMessage(instanceName, number, message) {
        try {
            const data = await this.makeRequest(`/message/sendText/${instanceName}`, {
                method: 'POST',
                body: JSON.stringify({
                    number: number,
                    text: message
                })
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw new Error(`Falha ao enviar mensagem: ${error.message}`);
        }
    }
    
    // Enviar mensagem com mídia
    async sendMediaMessage(instanceName, number, mediaData) {
        try {
            const data = await this.makeRequest(`/message/sendMedia/${instanceName}`, {
                method: 'POST',
                body: JSON.stringify({
                    number: number,
                    ...mediaData
                })
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao enviar mídia:', error);
            throw new Error(`Falha ao enviar mídia: ${error.message}`);
        }
    }
    
    // Obter status de uma instância específica
    async getInstanceStatus(instanceName) {
        try {
            const data = await this.makeRequest('/instance/fetchInstances', {
                method: 'GET'
            });
            
            // Procurar pela instância específica
            const instance = data.find(inst => 
                inst.instance && inst.instance.instanceName === instanceName
            );
            
            return instance || null;
        } catch (error) {
            console.error('Erro ao obter status da instância:', error);
            throw error;
        }
    }
    
    // Obter todas as instâncias
    async getAllInstances() {
        try {
            const data = await this.makeRequest('/instance/fetchInstances', {
                method: 'GET'
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao obter instâncias:', error);
            throw error;
        }
    }
    
    // Reiniciar instância
    async restartInstance(instanceName) {
        try {
            const data = await this.makeRequest(`/instance/restart/${instanceName}`, {
                method: 'PUT'
            });
            
            Utils.showToast('Instância reiniciada!', 'info');
            return data;
        } catch (error) {
            Utils.showToast(`Erro ao reiniciar instância: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // Desconectar instância
    async logoutInstance(instanceName) {
        try {
            const data = await this.makeRequest(`/instance/logout/${instanceName}`, {
                method: 'DELETE'
            });
            
            Utils.showToast('Instância desconectada!', 'info');
            return data;
        } catch (error) {
            Utils.showToast(`Erro ao desconectar instância: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // Obter informações do perfil
    async getProfileInfo(instanceName) {
        try {
            const data = await this.makeRequest(`/chat/whatsappProfile/${instanceName}`, {
                method: 'GET'
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao obter perfil:', error);
            throw error;
        }
    }
    
    // Verificar se número existe no WhatsApp
    async checkNumberExists(instanceName, numbers) {
        try {
            const data = await this.makeRequest(`/chat/whatsappNumbers/${instanceName}`, {
                method: 'POST',
                body: JSON.stringify({
                    numbers: Array.isArray(numbers) ? numbers : [numbers]
                })
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao verificar números:', error);
            throw error;
        }
    }
    
    // Obter conversas
    async getChats(instanceName) {
        try {
            const data = await this.makeRequest(`/chat/findChats/${instanceName}`, {
                method: 'GET'
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao obter conversas:', error);
            throw error;
        }
    }
    
    // Obter mensagens de uma conversa
    async getChatMessages(instanceName, remoteJid, limit = 50) {
        try {
            const data = await this.makeRequest(`/chat/findMessages/${instanceName}`, {
                method: 'POST',
                body: JSON.stringify({
                    where: {
                        remoteJid: remoteJid
                    },
                    limit: limit
                })
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao obter mensagens:', error);
            throw error;
        }
    }
    
    // Marcar mensagem como lida
    async markMessageAsRead(instanceName, remoteJid) {
        try {
            const data = await this.makeRequest(`/chat/markMessageAsRead/${instanceName}`, {
                method: 'PUT',
                body: JSON.stringify({
                    remoteJid: remoteJid
                })
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao marcar como lida:', error);
            throw error;
        }
    }
    
    // Atualizar presença (online/offline/typing)
    async updatePresence(instanceName, remoteJid, presence) {
        try {
            const data = await this.makeRequest(`/chat/updatePresence/${instanceName}`, {
                method: 'PUT',
                body: JSON.stringify({
                    remoteJid: remoteJid,
                    presence: presence // 'available', 'unavailable', 'composing', 'recording', 'paused'
                })
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao atualizar presença:', error);
            throw error;
        }
    }
    
    // Testar conectividade da API
    async testConnection() {
        try {
            const data = await this.makeRequest('/instance/fetchInstances', {
                method: 'GET'
            });
            
            return { status: 'connected', instances: data.length };
        } catch (error) {
            console.error('Erro ao testar conexão:', error);
            return { status: 'error', message: error.message };
        }
    }
}

// Factory para criar instância da API
const createEvolutionAPI = (config = CONFIG) => {
    return new EvolutionAPI(config.EVOLUTION_API_URL, config.EVOLUTION_API_KEY);
};

// Instância global da API
const evolutionAPI = createEvolutionAPI();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EvolutionAPI, createEvolutionAPI, evolutionAPI };
} else {
    window.EvolutionAPI = EvolutionAPI;
    window.createEvolutionAPI = createEvolutionAPI;
    window.evolutionAPI = evolutionAPI;
}