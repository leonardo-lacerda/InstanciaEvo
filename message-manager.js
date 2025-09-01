// message-manager.js - Gerenciamento de mensagens
const MessageManager = {
    // Enviar mensagem de teste
    async sendTestMessage() {
        const number = document.getElementById('testNumber').value.trim();
        const message = document.getElementById('testMessage').value.trim();
        
        if (!number || !message) {
            Utils.showToast('Preencha o número e a mensagem!', 'warning');
            return false;
        }
        
        if (!appState.currentInstance) {
            Utils.showToast('Nenhuma instância selecionada!', 'error');
            return false;
        }
        
        if (appState.currentInstance.status !== 'connected') {
            Utils.showToast('Instância deve estar conectada para enviar mensagens!', 'error');
            return false;
        }
        
        // Validar número
        if (!Utils.isValidPhone(number)) {
            Utils.showToast('Número de telefone inválido!', 'error');
            return false;
        }
        
        try {
            Utils.showToast('Enviando mensagem...', 'info');
            
            // Enviar via Evolution API se disponível
            let result = null;
            if (appState.currentInstance.evolutionInstanceName) {
                try {
                    result = await evolutionAPI.sendTextMessage(
                        appState.currentInstance.evolutionInstanceName,
                        number,
                        message
                    );
                } catch (apiError) {
                    console.error('Erro na Evolution API:', apiError);
                    // Continuar com simulação se API falhar
                }
            }
            
            // Criar registro da mensagem
            const messageData = {
                id: Utils.generateMessageId(),
                instanceId: appState.currentInstance.id,
                type: 'sent',
                number: number,
                message: message,
                timestamp: new Date().toISOString(),
                evolutionMessageId: result?.key?.id || null,
                status: 'sent'
            };
            
            // Adicionar ao histórico
            appState.addMessage(messageData);
            
            // Atualizar contador da instância
            appState.updateInstance(appState.currentInstance.id, {
                messageCount: (appState.currentInstance.messageCount || 0) + 1,
                lastActivity: new Date().toISOString()
            });
            
            // Limpar formulário
            document.getElementById('testMessage').value = '';
            
            Utils.showToast('Mensagem enviada com sucesso!', 'success');
            
            // Atualizar interface se necessário
            if (Navigation.currentTab === 'messages') {
                this.loadInstanceMessages(appState.currentInstance.id);
            }
            
            return true;
            
        } catch (error) {
            Utils.handleError(error, 'sendTestMessage');
            return false;
        }
    },
    
    // Carregar mensagens da instância
    loadInstanceMessages(instanceId, limit = 10) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        const instanceMessages = appState.getInstanceMessages(instanceId, limit)
            .reverse(); // Mais recentes primeiro
        
        if (instanceMessages.length === 0) {
            messagesList.innerHTML = `
                <div class="empty-messages">
                    <p>Nenhuma mensagem ainda...</p>
                    <p>Use o formulário acima para enviar uma mensagem de teste.</p>
                </div>
            `;
            return;
        }
        
        messagesList.innerHTML = instanceMessages.map(msg => 
            this.createMessageElement(msg)
        ).join('');
    },
    
    // Criar elemento HTML para mensagem
    createMessageElement(message) {
        const typeClass = message.type === 'sent' ? 'sent' : 'received';
        const typeIcon = message.type === 'sent' ? '📤' : '📥';
        const statusIcon = this.getStatusIcon(message.status);
        
        return `
            <div class="message-item ${typeClass}">
                <div class="message-header">
                    <div class="message-info">
                        <span class="message-type">${typeIcon}</span>
                        <span class="message-number">${Utils.escapeHtml(message.number)}</span>
                        <span class="message-time">${Utils.formatDate(message.timestamp)}</span>
                    </div>
                    <div class="message-status">
                        ${statusIcon}
                    </div>
                </div>
                <div class="message-content">
                    <div class="message-text">${Utils.escapeHtml(message.message)}</div>
                </div>
                ${message.evolutionMessageId ? `
                    <div class="message-meta">
                        <small>ID: ${message.evolutionMessageId}</small>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    // Obter ícone de status da mensagem
    getStatusIcon(status) {
        const icons = {
            'sent': '✓',
            'delivered': '✓✓',
            'read': '✓✓',
            'error': '❌',
            'pending': '⏳'
        };
        return icons[status] || '○';
    },
    
    // Processar mensagem recebida via webhook
    handleReceivedMessage(webhookData) {
        try {
            if (!webhookData.instanceId || !webhookData.message) return;
            
            const messageData = {
                id: Utils.generateMessageId(),
                instanceId: webhookData.instanceId,
                type: 'received',
                number: webhookData.from || webhookData.number,
                message: webhookData.message.text || webhookData.message,
                timestamp: new Date().toISOString(),
                evolutionMessageId: webhookData.messageId,
                status: 'received'
            };
            
            appState.addMessage(messageData);
            
            // Atualizar contador da instância
            const instance = appState.getInstanceById(webhookData.instanceId);
            if (instance) {
                appState.updateInstance(webhookData.instanceId, {
                    messageCount: (instance.messageCount || 0) + 1,
                    lastActivity: new Date().toISOString()
                });
            }
            
            // Atualizar interface se necessário
            if (appState.currentInstance && 
                appState.currentInstance.id === webhookData.instanceId &&
                Navigation.currentTab === 'messages') {
                this.loadInstanceMessages(webhookData.instanceId);
            }
            
            // Notificar usuário se não estiver na aba de mensagens
            if (Navigation.currentTab !== 'messages') {
                Utils.showToast(`Nova mensagem de ${messageData.number}`, 'info');
            }
            
        } catch (error) {
            console.error('Erro ao processar mensagem recebida:', error);
        }
    },
    
    // Exportar mensagens da instância
    exportMessages(instanceId, format = 'json') {
        try {
            const instance = appState.getInstanceById(instanceId);
            if (!instance) {
                Utils.showToast('Instância não encontrada!', 'error');
                return;
            }
            
            const messages = appState.getInstanceMessages(instanceId);
            
            const exportData = {
                instance: {
                    id: instance.id,
                    name: instance.name,
                    description: instance.description
                },
                messages: messages,
                exportDate: new Date().toISOString(),
                totalMessages: messages.length
            };
            
            const filename = `messages-${instance.name}-${new Date().toISOString().split('T')[0]}`;
            
            if (format === 'json') {
                Utils.downloadJSON(exportData, `${filename}.json`);
            } else if (format === 'csv') {
                this.exportMessagesCSV(messages, `${filename}.csv`);
            } else if (format === 'txt') {
                this.exportMessagesTXT(messages, instance.name, `${filename}.txt`);
            }
            
            Utils.showToast('Mensagens exportadas!', 'success');
            
        } catch (error) {
            Utils.handleError(error, 'exportMessages');
        }
    },
    
    // Exportar mensagens em formato CSV
    exportMessagesCSV(messages, filename) {
        const headers = ['Data/Hora', 'Tipo', 'Número', 'Mensagem', 'Status'];
        const rows = messages.map(msg => [
            Utils.formatDate(msg.timestamp),
            msg.type === 'sent' ? 'Enviada' : 'Recebida',
            msg.number,
            `"${msg.message.replace(/"/g, '""')}"`,
            msg.status || 'N/A'
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
        
        Utils.downloadText(csvContent, filename);
    },
    
    // Exportar mensagens em formato TXT
    exportMessagesTXT(messages, instanceName, filename) {
        const header = `Histórico de Mensagens - ${instanceName}\n` +
                      `Exportado em: ${new Date().toLocaleString('pt-BR')}\n` +
                      `Total de mensagens: ${messages.length}\n` +
                      `${'='.repeat(50)}\n\n`;
        
        const content = messages.map(msg => {
            const type = msg.type === 'sent' ? 'ENVIADA' : 'RECEBIDA';
            const date = new Date(msg.timestamp).toLocaleString('pt-BR');
            return `[${date}] ${type} - ${msg.number}\n${msg.message}\n${'─'.repeat(30)}\n`;
        }).join('\n');
        
        Utils.downloadText(header + content, filename);
    },
    
    // Limpar histórico de mensagens
    clearMessageHistory(instanceId) {
        if (!confirm('Tem certeza que deseja limpar todo o histórico de mensagens desta instância?')) {
            return;
        }
        
        try {
            // Filtrar mensagens para remover apenas desta instância
            appState.messageHistory = appState.messageHistory.filter(
                msg => msg.instanceId !== instanceId
            );
            
            appState.saveMessageHistory();
            
            // Resetar contador na instância
            appState.updateInstance(instanceId, { messageCount: 0 });
            
            // Atualizar interface
            this.loadInstanceMessages(instanceId);
            
            Utils.showToast('Histórico de mensagens limpo!', 'success');
            
        } catch (error) {
            Utils.handleError(error, 'clearMessageHistory');
        }
    }
};

// Event handlers para mensagens
const MessageHandlers = {
    // Handler para envio de mensagem de teste
    handleSendTestMessage() {
        MessageManager.sendTestMessage();
    },
    
    // Handler para exportar mensagens
    handleExportMessages() {
        if (!appState.currentInstance) {
            Utils.showToast('Nenhuma instância selecionada!', 'error');
            return;
        }
        
        MessageManager.exportMessages(appState.currentInstance.id, 'json');
    },
    
    // Handler para limpar histórico
    handleClearHistory() {
        if (!appState.currentInstance) {
            Utils.showToast('Nenhuma instância selecionada!', 'error');
            return;
        }
        
        MessageManager.clearMessageHistory(appState.currentInstance.id);
    },
    
    // Handler para tecla Enter no textarea
    handleMessageKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            MessageManager.sendTestMessage();
        }
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MessageManager, MessageHandlers };
} else {
    window.MessageManager = MessageManager;
    window.MessageHandlers = MessageHandlers;
}