// modal.js - Sistema de modais e dialogs
const Modal = {
    currentModal: null,
    currentAction: null,
    
    // Mostrar modal genérico
    show(title, content, buttons = null) {
        const modal = document.getElementById('importExportModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalTextarea = document.getElementById('modalTextarea');
        const modalFooter = modal.querySelector('.modal-footer');
        
        if (!modal || !modalTitle || !modalTextarea) return;
        
        modalTitle.textContent = title;
        modalTextarea.value = content;
        
        // Configurar botões se fornecidos
        if (buttons) {
            modalFooter.innerHTML = buttons.map(btn => 
                `<button id="${btn.id}" class="${btn.class}">${btn.text}</button>`
            ).join('');
            
            // Adicionar event listeners
            buttons.forEach(btn => {
                const element = document.getElementById(btn.id);
                if (element && btn.onClick) {
                    element.addEventListener('click', btn.onClick);
                }
            });
        }
        
        modal.classList.add('show');
        this.currentModal = modal;
        
        // Focar no textarea
        setTimeout(() => modalTextarea.focus(), 100);
    },
    
    // Fechar modal
    close() {
        if (this.currentModal) {
            this.currentModal.classList.remove('show');
            this.currentModal = null;
            this.currentAction = null;
        }
    },
    
    // Modal para edição de instância
    showEditInstance(instance) {
        const content = JSON.stringify({
            name: instance.name,
            description: instance.description,
            webhookUrl: instance.webhookUrl || ''
        }, null, 2);
        
        this.show('Editar Instância', content);
        
        const modal = document.getElementById('importExportModal');
        modal.dataset.action = 'edit';
        modal.dataset.instanceId = instance.id;
        this.currentAction = 'edit';
    },
    
    // Modal para exportar dados
    showExportData(data, title = 'Exportar Dados') {
        const content = JSON.stringify(data, null, 2);
        this.show(title, content);
        this.currentAction = 'export';
    },
    
    // Modal para importar dados
    showImportData(title = 'Importar Dados') {
        this.show(title, '');
        this.currentAction = 'import';
    },
    
    // Modal para confirmar ação
    showConfirm(title, message, onConfirm, onCancel = null) {
        const modal = document.createElement('div');
        modal.className = 'modal confirm-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button id="confirmCancel" class="cancel-btn">Cancelar</button>
                    <button id="confirmOk" class="confirm-btn">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('show');
        
        // Event listeners
        document.getElementById('confirmCancel').addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });
        
        document.getElementById('confirmOk').addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });
        
        // Fechar com Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        document.addEventListener('keydown', handleEscape);
    },
    
    // Processar confirmação do modal
    handleConfirm() {
        const modal = document.getElementById('importExportModal');
        const textarea = document.getElementById('modalTextarea');
        
        if (!modal || !textarea) return;
        
        const action = modal.dataset.action || this.currentAction;
        
        try {
            switch (action) {
                case 'edit':
                    this.handleEditInstance(modal, textarea);
                    break;
                case 'import':
                    this.handleImportData(textarea);
                    break;
                default:
                    this.close();
            }
        } catch (error) {
            Utils.handleError(error, 'modal confirm');
        }
    },
    
    // Processar edição de instância
    handleEditInstance(modal, textarea) {
        const instanceId = modal.dataset.instanceId;
        const instance = appState.getInstanceById(instanceId);
        
        if (!instance) {
            Utils.showToast('Instância não encontrada!', 'error');
            return;
        }
        
        try {
            const data = JSON.parse(textarea.value);
            
            // Validar dados
            if (!data.name || !data.name.trim()) {
                Utils.showToast('Nome da instância é obrigatório!', 'error');
                return;
            }
            
            // Verificar duplicatas (exceto a própria instância)
            const existingInstance = appState.instances.find(
                i => i.id !== instanceId && i.name.toLowerCase() === data.name.trim().toLowerCase()
            );
            
            if (existingInstance) {
                Utils.showToast('Já existe uma instância com este nome!', 'error');
                return;
            }
            
            // Validar webhook URL se fornecida
            if (data.webhookUrl && !Utils.isValidUrl(data.webhookUrl)) {
                Utils.showToast('URL do webhook inválida!', 'error');
                return;
            }
            
            // Atualizar instância
            appState.updateInstance(instanceId, {
                name: data.name.trim(),
                description: data.description?.trim() || '',
                webhookUrl: data.webhookUrl?.trim() || '',
                lastActivity: new Date().toISOString()
            });
            
            InstanceManager.loadInstancesList();
            Utils.showToast('Instância atualizada!', 'success');
            this.close();
            
        } catch (error) {
            Utils.showToast('Dados inválidos! Verifique o formato JSON.', 'error');
        }
    },
    
    // Processar importação de dados
    handleImportData(textarea) {
        try {
            const data = JSON.parse(textarea.value);
            
            if (!data || typeof data !== 'object') {
                throw new Error('Formato de dados inválido');
            }
            
            // Determinar tipo de importação
            if (data.instances && Array.isArray(data.instances)) {
                this.importFullBackup(data);
            } else if (data.instance && data.businessData) {
                this.importInstanceConfig(data);
            } else if (data.messages && Array.isArray(data.messages)) {
                this.importMessages(data);
            } else {
                throw new Error('Tipo de dados não reconhecido');
            }
            
            this.close();
            
        } catch (error) {
            Utils.showToast(`Erro na importação: ${error.message}`, 'error');
        }
    },
    
    // Importar backup completo
    importFullBackup(data) {
        if (!confirm('Isso substituirá todos os dados atuais. Continuar?')) {
            return;
        }
        
        try {
            appState.restoreBackup(data);
            
            if (Navigation.currentPage === 'admin') {
                InstanceManager.loadInstancesList();
                Analytics.updateStatistics();
            }
            
            Utils.showToast('Backup restaurado com sucesso!', 'success');
        } catch (error) {
            throw new Error(`Falha ao restaurar backup: ${error.message}`);
        }
    },
    
    // Importar configuração de instância
    importInstanceConfig(data) {
        // Implementar importação de configuração específica
        Utils.showToast('Funcionalidade em desenvolvimento', 'info');
    },
    
    // Importar mensagens
    importMessages(data) {
        // Implementar importação de mensagens
        Utils.showToast('Funcionalidade em desenvolvimento', 'info');
    }
};

// Event handlers para modais
const ModalHandlers = {
    // Handler para fechar modal
    handleCloseModal() {
        Modal.close();
    },
    
    // Handler para confirmar modal
    handleConfirmModal() {
        Modal.handleConfirm();
    },
    
    // Handler para cancelar modal
    handleCancelModal() {
        Modal.close();
    },
    
    // Handler para clique fora do modal
    handleModalOverlayClick(e) {
        if (e.target.classList.contains('modal')) {
            Modal.close();
        }
    }
};

// Configurar event listeners globais para modais
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && Modal.currentModal) {
        Modal.close();
    }
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Modal, ModalHandlers };
} else {
    window.Modal = Modal;
    window.ModalHandlers = ModalHandlers;
}