// instance-page.js - Gerenciamento da página da instância
const InstancePage = {
    // Configurar página da instância
    setup(instance) {
        try {
            // Atualizar título e informações
            document.getElementById('instanceTitle').textContent = `Configurar ${instance.name}`;
            document.getElementById('instanceSubtitle').textContent = 
                instance.description || 'Escaneie o QR Code abaixo com seu WhatsApp';
            
            // Atualizar status de conexão
            this.updateConnectionStatus();
            
            // Carregar QR Code se disponível
            if (instance.qrCode) {
                this.displayQRCode(instance.qrCode);
            } else {
                this.generateQRCode(instance.id);
            }
            
            // Carregar URL do webhook
            if (instance.webhookUrl) {
                document.getElementById('webhookUrlInstance').value = instance.webhookUrl;
                this.updateWebhookStatus('configured');
            } else {
                this.updateWebhookStatus('not_configured');
            }
            
            // Carregar dados do negócio
            if (instance.businessData) {
                BusinessConfig.loadBusinessData(instance.businessData);
            }
            
            // Carregar mensagens e analytics
            MessageManager.loadInstanceMessages(instance.id);
            Analytics.updateInstanceAnalytics();
            
            // Definir aba padrão
            Navigation.switchTab('config');
            
        } catch (error) {
            Utils.handleError(error, 'setup instance page');
        }
    },
    
    // Atualizar status de conexão
    updateConnectionStatus() {
        if (!appState.currentInstance) return;
        
        const statusIndicator = document.querySelector('.connection-status .status-indicator');
        const statusText = document.querySelector('.connection-status .status-text');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = `status-indicator ${appState.currentInstance.status}`;
            statusText.textContent = Utils.getStatusText(appState.currentInstance.status);
        }
    },
    
    // Gerar novo QR Code
    async generateQRCode(instanceId) {
        const qrContainer = document.getElementById('qrContainer');
        if (!qrContainer) return;
        
        qrContainer.innerHTML = '<div class="qr-placeholder loading">Gerando QR Code...</div>';
        
        try {
            const instance = appState.getInstanceById(instanceId);
            if (!instance || !instance.evolutionInstanceName) {
                throw new Error('Instância não encontrada ou mal configurada');
            }
            
            // Tentar obter QR Code da Evolution API
            const result = await evolutionAPI.getQRCode(instance.evolutionInstanceName);
            
            if (result.qrcode && result.qrcode.base64) {
                this.displayQRCode(result.qrcode.base64);
                
                // Salvar QR Code na instância
                appState.updateInstance(instanceId, {
                    qrCode: result.qrcode.base64,
                    status: 'waiting_qr',
                    lastActivity: new Date().toISOString()
                });
                
                this.updateConnectionStatus();
            } else {
                throw new Error('QR Code não recebido da API');
            }
            
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            
            // Fallback: usar QR Code simulado
            const mockQR = Utils.generateMockQRCode();
            this.displayQRCode(mockQR);
            
            appState.updateInstance(instanceId, {
                qrCode: mockQR,
                status: 'waiting_qr',
                lastActivity: new Date().toISOString()
            });
            
            Utils.showToast('QR Code gerado (modo demonstração)', 'warning');
        }
    },
    
    // Exibir QR Code
    displayQRCode(qrCodeData) {
        const qrContainer = document.getElementById('qrContainer');
        if (!qrContainer) return;
        
        qrContainer.innerHTML = `
            <div class="qr-code-wrapper">
                <img id="qrCodeImage" src="data:image/png;base64,${qrCodeData}" 
                     alt="QR Code para conectar WhatsApp" 
                     class="qr-code-image">
                <div class="qr-overlay">
                    <div class="qr-status">
                        <span class="qr-status-text">Escaneie com o WhatsApp</span>
                    </div>
                </div>
            </div>
        `;
        
        // Mostrar botão de download
        const downloadBtn = document.getElementById('downloadQR');
        if (downloadBtn) {
            downloadBtn.style.display = 'inline-block';
        }
    },
    
    // Atualizar QR Code
    async refreshQRCode() {
        if (!appState.currentInstance) return;
        
        Utils.showToast('Atualizando QR Code...', 'info');
        await this.generateQRCode(appState.currentInstance.id);
    },
    
    // Baixar QR Code
    downloadQRCode() {
        const qrImage = document.getElementById('qrCodeImage');
        if (!qrImage || !appState.currentInstance) return;
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = qrImage.naturalWidth;
            canvas.height = qrImage.naturalHeight;
            
            ctx.drawImage(qrImage, 0, 0);
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `qr-code-${appState.currentInstance.name}.png`;
                link.href = url;
                link.click();
                
                URL.revokeObjectURL(url);
                Utils.showToast('QR Code baixado!', 'success');
            });
            
        } catch (error) {
            console.error('Erro ao baixar QR Code:', error);
            Utils.showToast('Erro ao baixar QR Code', 'error');
        }
    },
    
    // Testar webhook
    async testWebhook() {
        const webhookUrl = document.getElementById('webhookUrlInstance').value.trim();
        
        if (!webhookUrl) {
            Utils.showToast('Digite a URL do webhook primeiro!', 'warning');
            return;
        }
        
        if (!Utils.isValidUrl(webhookUrl)) {
            Utils.showToast('URL inválida!', 'error');
            return;
        }
        
        this.updateWebhookStatus('testing');
        
        const testData = {
            type: 'test',
            instanceId: appState.currentInstance.id,
            instanceName: appState.currentInstance.name,
            timestamp: new Date().toISOString(),
            message: 'Teste de webhook do Evolution API Manager',
            version: CONFIG.VERSION
        };
        
        try {
            const response = await Utils.withTimeout(
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Evolution-Manager': 'test'
                    },
                    body: JSON.stringify(testData)
                }),
                10000 // 10 segundos de timeout
            );
            
            if (response.ok) {
                this.updateWebhookStatus('success');
                Utils.showToast('Webhook testado com sucesso!', 'success');
                
                // Salvar URL do webhook
                appState.updateInstance(appState.currentInstance.id, {
                    webhookUrl: webhookUrl,
                    lastActivity: new Date().toISOString()
                });
                
                // Configurar webhook na Evolution API
                if (appState.currentInstance.evolutionInstanceName) {
                    try {
                        await evolutionAPI.setWebhook(
                            appState.currentInstance.evolutionInstanceName, 
                            webhookUrl
                        );
                    } catch (error) {
                        console.error('Erro ao configurar webhook na Evolution API:', error);
                    }
                }
                
            } else {
                this.updateWebhookStatus('error');
                Utils.showToast(`Erro no webhook: HTTP ${response.status}`, 'error');
            }
            
        } catch (error) {
            console.error('Erro ao testar webhook:', error);
            this.updateWebhookStatus('error');
            
            if (error.message === 'Timeout') {
                Utils.showToast('Timeout: Webhook não respondeu em 10 segundos', 'error');
            } else {
                Utils.showToast('Erro de conexão com o webhook', 'error');
            }
        }
    },
    
    // Atualizar status do webhook
    updateWebhookStatus(status) {
        const webhookStatus = document.getElementById('webhookStatus');
        if (!webhookStatus) return;
        
        const indicator = webhookStatus.querySelector('.status-indicator');
        const text = webhookStatus.querySelector('.status-text');
        
        const statusConfig = {
            'not_configured': { color: '#666', text: 'Não configurado' },
            'configured': { color: '#f39c12', text: 'Configurado' },
            'testing': { color: '#3498db', text: 'Testando...' },
            'success': { color: '#27ae60', text: 'Funcionando' },
            'error': { color: '#e74c3c', text: 'Erro' }
        };
        
        const config = statusConfig[status] || statusConfig['not_configured'];
        
        if (indicator) indicator.style.backgroundColor = config.color;
        if (text) text.textContent = config.text;
    }
};

// Event handlers para a página da instância
const InstancePageHandlers = {
    // Handler para refresh do QR Code
    handleRefreshQR() {
        InstancePage.refreshQRCode();
    },
    
    // Handler para download do QR Code
    handleDownloadQR() {
        InstancePage.downloadQRCode();
    },
    
    // Handler para teste de webhook
    handleTestWebhook() {
        InstancePage.testWebhook();
    },
    
    // Handler para mudança na URL do webhook
    handleWebhookUrlChange() {
        const webhookUrl = document.getElementById('webhookUrlInstance').value.trim();
        if (webhookUrl && Utils.isValidUrl(webhookUrl)) {
            InstancePage.updateWebhookStatus('configured');
        } else if (webhookUrl) {
            InstancePage.updateWebhookStatus('error');
        } else {
            InstancePage.updateWebhookStatus('not_configured');
        }
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InstancePage, InstancePageHandlers };
} else {
    window.InstancePage = InstancePage;
    window.InstancePageHandlers = InstancePageHandlers;
}