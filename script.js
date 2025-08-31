// Configurações da aplicação
const CONFIG = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'admin123',
    EVOLUTION_API_URL: 'https://promptaaievo.discloud.app/manager', // Altere para sua URL da Evolution API
    EVOLUTION_API_KEY: 'X7mR4qP2tH9bW6zC' // Altere para sua API key
};

// Estado da aplicação
let appState = {
    instances: [],
    currentUser: null,
    currentInstance: null
};

// Elementos DOM
const loginPage = document.getElementById('loginPage');
const adminPage = document.getElementById('adminPage');
const instancePage = document.getElementById('instancePage');

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkUrlParams();
});

function initializeApp() {
    // Carrega dados salvos
    loadInstancesFromStorage();
    
    // Verifica se há uma sessão ativa
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
        showPage('admin');
        loadInstancesList();
    } else {
        showPage('login');
    }
}

function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Admin
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('createInstanceForm').addEventListener('submit', handleCreateInstance);
    
    // Instance page
    document.getElementById('refreshQR').addEventListener('click', refreshQRCode);
    document.getElementById('addService').addEventListener('click', addServiceField);
    document.getElementById('businessForm').addEventListener('submit', handleBusinessFormSubmit);
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const instanceId = urlParams.get('instance');
    
    if (instanceId) {
        // Carrega a página da instância diretamente
        loadInstancePage(instanceId);
    }
}

// === FUNÇÕES DE NAVEGAÇÃO ===
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// === FUNÇÕES DE AUTENTICAÇÃO ===
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
        appState.currentUser = { username: username, role: 'admin' };
        localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
        showPage('admin');
        loadInstancesList();
        showToast('Login realizado com sucesso!', 'success');
    } else {
        showToast('Usuário ou senha incorretos!', 'error');
    }
}

function handleLogout() {
    appState.currentUser = null;
    localStorage.removeItem('currentUser');
    showPage('login');
    document.getElementById('loginForm').reset();
    showToast('Logout realizado com sucesso!', 'success');
}

// === FUNÇÕES DE GERENCIAMENTO DE INSTÂNCIAS ===
function handleCreateInstance(e) {
    e.preventDefault();
    
    const instanceName = document.getElementById('instanceName').value;
    const instanceId = generateInstanceId();
    
    const newInstance = {
        id: instanceId,
        name: instanceName,
        created: new Date().toISOString(),
        status: 'disconnected',
        qrCode: null,
        webhookUrl: '',
        businessData: null
    };
    
    appState.instances.push(newInstance);
    saveInstancesToStorage();
    loadInstancesList();
    
    document.getElementById('createInstanceForm').reset();
    showToast('Instância criada com sucesso!', 'success');
    
    // Criar instância na Evolution API (simulado)
    createEvolutionInstance(instanceId, instanceName);
}

function createEvolutionInstance(instanceId, instanceName) {
    // Aqui você faria a chamada real para a Evolution API
    console.log(`Criando instância ${instanceName} com ID ${instanceId} na Evolution API`);
    
    // Simulação da resposta da API
    setTimeout(() => {
        const instance = appState.instances.find(i => i.id === instanceId);
        if (instance) {
            instance.status = 'waiting_qr';
            instance.qrCode = generateMockQRCode();
            saveInstancesToStorage();
            loadInstancesList();
        }
    }, 1000);
}

function loadInstancesList() {
    const instancesList = document.getElementById('instancesList');
    instancesList.innerHTML = '';
    
    if (appState.instances.length === 0) {
        instancesList.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma instância criada ainda.</p>';
        return;
    }
    
    appState.instances.forEach(instance => {
        const instanceElement = createInstanceElement(instance);
        instancesList.appendChild(instanceElement);
    });
}

function createInstanceElement(instance) {
    const div = document.createElement('div');
    div.className = 'instance-item';
    div.innerHTML = `
        <div class="instance-info">
            <h3>${instance.name}</h3>
            <p>ID: ${instance.id}</p>
            <p>Status: <span style="color: ${getStatusColor(instance.status)}">${getStatusText(instance.status)}</span></p>
            <p>Criada em: ${new Date(instance.created).toLocaleString('pt-BR')}</p>
        </div>
        <div class="instance-actions">
            <button class="copy-btn" onclick="copyInstanceLink('${instance.id}')">Copiar Link</button>
            <button class="delete-btn" onclick="deleteInstance('${instance.id}')">Excluir</button>
        </div>
    `;
    return div;
}

function getStatusColor(status) {
    const colors = {
        'disconnected': '#e74c3c',
        'waiting_qr': '#f39c12',
        'connected': '#27ae60'
    };
    return colors[status] || '#666';
}

function getStatusText(status) {
    const texts = {
        'disconnected': 'Desconectado',
        'waiting_qr': 'Aguardando QR',
        'connected': 'Conectado'
    };
    return texts[status] || 'Desconhecido';
}

function copyInstanceLink(instanceId) {
    const baseUrl = window.location.origin + window.location.pathname;
    const instanceLink = `${baseUrl}?instance=${instanceId}`;
    
    navigator.clipboard.writeText(instanceLink).then(() => {
        showToast('Link copiado para a área de transferência!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar link:', err);
        showToast('Erro ao copiar link. Tente novamente.', 'error');
    });
}

function deleteInstance(instanceId) {
    if (confirm('Tem certeza que deseja excluir esta instância?')) {
        appState.instances = appState.instances.filter(i => i.id !== instanceId);
        saveInstancesToStorage();
        loadInstancesList();
        showToast('Instância excluída com sucesso!', 'success');
        
        // Aqui você faria a chamada para deletar na Evolution API
        deleteEvolutionInstance(instanceId);
    }
}

function deleteEvolutionInstance(instanceId) {
    console.log(`Deletando instância ${instanceId} na Evolution API`);
    // Implementar chamada real para a Evolution API
}

// === FUNÇÕES DA PÁGINA DA INSTÂNCIA ===
function loadInstancePage(instanceId) {
    const instance = appState.instances.find(i => i.id === instanceId);
    
    if (!instance) {
        showToast('Instância não encontrada!', 'error');
        return;
    }
    
    appState.currentInstance = instance;
    showPage('instance');
    
    // Carregar QR Code se disponível
    if (instance.qrCode) {
        displayQRCode(instance.qrCode);
    } else {
        generateQRCode(instanceId);
    }
    
    // Carregar URL do webhook se disponível
    if (instance.webhookUrl) {
        document.getElementById('webhookUrl').value = instance.webhookUrl;
    }
    
    // Carregar dados do negócio se disponíveis
    if (instance.businessData) {
        loadBusinessData(instance.businessData);
    }
}

function generateQRCode(instanceId) {
    // Simulação da geração do QR Code
    // Na implementação real, você faria uma chamada para a Evolution API
    setTimeout(() => {
        const qrCode = generateMockQRCode();
        displayQRCode(qrCode);
        
        // Salvar QR Code na instância
        const instance = appState.instances.find(i => i.id === instanceId);
        if (instance) {
            instance.qrCode = qrCode;
            saveInstancesToStorage();
        }
    }, 1000);
}

function displayQRCode(qrCodeData) {
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = `<img src="data:image/png;base64,${qrCodeData}" alt="QR Code" style="max-width: 250px; max-height: 250px;">`;
}

function refreshQRCode() {
    if (appState.currentInstance) {
        const qrContainer = document.getElementById('qrContainer');
        qrContainer.innerHTML = '<div class="qr-placeholder">Gerando novo QR Code...</div>';
        generateQRCode(appState.currentInstance.id);
        showToast('QR Code atualizado!', 'success');
    }
}

// === FUNÇÕES DO FORMULÁRIO DE NEGÓCIO ===
function addServiceField() {
    const servicesContainer = document.getElementById('servicesContainer');
    const serviceItem = document.createElement('div');
    serviceItem.className = 'service-item';
    serviceItem.innerHTML = `
        <div class="input-row">
            <div class="input-group">
                <label>Nome do serviço/produto *</label>
                <input type="text" name="serviceName" required>
            </div>
            <div class="input-group">
                <label>Preço (R$) *</label>
                <input type="number" step="0.01" name="servicePrice" required>
            </div>
        </div>
        <div class="input-row">
            <div class="input-group">
                <label>Tempo estimado (minutos)</label>
                <input type="number" name="serviceDuration">
            </div>
            <div class="input-group">
                <label>Observações/Regras</label>
                <input type="text" name="serviceNotes">
                <button type="button" class="remove-btn" onclick="removeServiceField(this)">Remover</button>
            </div>
        </div>
    `;
    servicesContainer.appendChild(serviceItem);
}

function removeServiceField(button) {
    const serviceItem = button.closest('.service-item');
    serviceItem.remove();
}

function handleBusinessFormSubmit(e) {
    e.preventDefault();
    
    if (!appState.currentInstance) {
        showToast('Erro: Instância não encontrada!', 'error');
        return;
    }
    
    const formData = collectBusinessFormData();
    
    // Salvar dados na instância
    appState.currentInstance.businessData = formData;
    
    // Atualizar instância no array
    const instanceIndex = appState.instances.findIndex(i => i.id === appState.currentInstance.id);
    if (instanceIndex !== -1) {
        appState.instances[instanceIndex] = appState.currentInstance;
        saveInstancesToStorage();
    }
    
    showToast('Configurações salvas com sucesso!', 'success');
    
    // Enviar dados para o webhook (N8N)
    if (appState.currentInstance.webhookUrl) {
        sendDataToWebhook(formData);
    }
}

function collectBusinessFormData() {
    const form = document.getElementById('businessForm');
    const formData = new FormData(form);
    
    const data = {
        instanceId: appState.currentInstance.id,
        timestamp: new Date().toISOString(),
        basicInfo: {
            businessName: document.getElementById('businessName').value,
            businessAddress: document.getElementById('businessAddress').value,
            businessCity: document.getElementById('businessCity').value,
            businessPhone: document.getElementById('businessPhone').value,
            businessEmail: document.getElementById('businessEmail').value,
            businessWebsite: document.getElementById('businessWebsite').value
        },
        schedule: collectScheduleData(),
        services: collectServicesData(),
        appointments: {
            type: document.getElementById('appointmentType').value,
            simultaneous: document.getElementById('simultaneousAppointments').value,
            interval: document.getElementById('appointmentInterval').value,
            cancellationPolicy: document.getElementById('cancellationPolicy').value
        },
        whatsapp: {
            welcomeMessage: document.getElementById('welcomeMessage').value,
            autoResponse: document.getElementById('autoResponse').value,
            faq: document.getElementById('faq').value
        }
    };
    
    return data;
}

function collectScheduleData() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const schedule = {};
    
    days.forEach(day => {
        schedule[day] = {
            open: document.getElementById(`${day}_open`).value,
            close: document.getElementById(`${day}_close`).value,
            breakStart: document.getElementById(`${day}_break_start`).value,
            breakEnd: document.getElementById(`${day}_break_end`).value
        };
    });
    
    return schedule;
}

function collectServicesData() {
    const services = [];
    const serviceItems = document.querySelectorAll('.service-item');
    
    serviceItems.forEach(item => {
        const name = item.querySelector('input[name="serviceName"]').value;
        const price = item.querySelector('input[name="servicePrice"]').value;
        const duration = item.querySelector('input[name="serviceDuration"]').value;
        const notes = item.querySelector('input[name="serviceNotes"]').value;
        
        if (name && price) {
            services.push({
                name: name,
                price: parseFloat(price),
                duration: parseInt(duration) || 0,
                notes: notes
            });
        }
    });
    
    return services;
}

function loadBusinessData(businessData) {
    if (!businessData) return;
    
    // Carregar informações básicas
    const basic = businessData.basicInfo;
    if (basic) {
        document.getElementById('businessName').value = basic.businessName || '';
        document.getElementById('businessAddress').value = basic.businessAddress || '';
        document.getElementById('businessCity').value = basic.businessCity || '';
        document.getElementById('businessPhone').value = basic.businessPhone || '';
        document.getElementById('businessEmail').value = basic.businessEmail || '';
        document.getElementById('businessWebsite').value = basic.businessWebsite || '';
    }
    
    // Carregar horários
    if (businessData.schedule) {
        Object.keys(businessData.schedule).forEach(day => {
            const schedule = businessData.schedule[day];
            document.getElementById(`${day}_open`).value = schedule.open || '';
            document.getElementById(`${day}_close`).value = schedule.close || '';
            document.getElementById(`${day}_break_start`).value = schedule.breakStart || '';
            document.getElementById(`${day}_break_end`).value = schedule.breakEnd || '';
        });
    }
    
    // Carregar serviços
    if (businessData.services && businessData.services.length > 0) {
        const servicesContainer = document.getElementById('servicesContainer');
        servicesContainer.innerHTML = ''; // Limpar serviços existentes
        
        businessData.services.forEach(service => {
            addServiceField();
            const lastServiceItem = servicesContainer.lastElementChild;
            lastServiceItem.querySelector('input[name="serviceName"]').value = service.name;
            lastServiceItem.querySelector('input[name="servicePrice"]').value = service.price;
            lastServiceItem.querySelector('input[name="serviceDuration"]').value = service.duration;
            lastServiceItem.querySelector('input[name="serviceNotes"]').value = service.notes;
        });
    }
    
    // Carregar configurações de agendamento
    const appointments = businessData.appointments;
    if (appointments) {
        document.getElementById('appointmentType').value = appointments.type || 'online';
        document.getElementById('simultaneousAppointments').value = appointments.simultaneous || 1;
        document.getElementById('appointmentInterval').value = appointments.interval || 30;
        document.getElementById('cancellationPolicy').value = appointments.cancellationPolicy || '';
    }
    
    // Carregar configurações do WhatsApp
    const whatsapp = businessData.whatsapp;
    if (whatsapp) {
        document.getElementById('welcomeMessage').value = whatsapp.welcomeMessage || '';
        document.getElementById('autoResponse').value = whatsapp.autoResponse || '';
        document.getElementById('faq').value = whatsapp.faq || '';
    }
}

function sendDataToWebhook(data) {
    if (!appState.currentInstance.webhookUrl) {
        console.log('Webhook URL não configurada');
        return;
    }
    
    fetch(appState.currentInstance.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            showToast('Dados enviados para o N8N com sucesso!', 'success');
        } else {
            showToast('Erro ao enviar dados para o N8N', 'error');
        }
    })
    .catch(error => {
        console.error('Erro ao enviar dados:', error);
        showToast('Erro de conexão com o N8N', 'error');
    });
}

// === FUNÇÕES UTILITÁRIAS ===
function generateInstanceId() {
    return 'inst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateMockQRCode() {
    // Gera um QR Code base64 simulado (placeholder)
    // Na implementação real, isso viria da Evolution API
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

function saveInstancesToStorage() {
    localStorage.setItem('evolutionInstances', JSON.stringify(appState.instances));
}

function loadInstancesFromStorage() {
    const saved = localStorage.getItem('evolutionInstances');
    if (saved) {
        appState.instances = JSON.parse(saved);
    }
}

function showToast(message, type = 'success') {
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
    
    // Remove o toast após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// === INTEGRAÇÃO COM EVOLUTION API ===
class EvolutionAPI {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    
    async createInstance(instanceName) {
        try {
            const response = await fetch(`${this.baseUrl}/instance/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.apiKey
                },
                body: JSON.stringify({
                    instanceName: instanceName,
                    integration: 'WHATSAPP-BAILEYS'
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao criar instância:', error);
            throw error;
        }
    }
    
    async getQRCode(instanceName) {
        try {
            const response = await fetch(`${this.baseUrl}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: {
                    'apikey': this.apiKey
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao obter QR Code:', error);
            throw error;
        }
    }
    
    async deleteInstance(instanceName) {
        try {
            const response = await fetch(`${this.baseUrl}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: {
                    'apikey': this.apiKey
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao deletar instância:', error);
            throw error;
        }
    }
    
    async setWebhook(instanceName, webhookUrl) {
        try {
            const response = await fetch(`${this.baseUrl}/webhook/set/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.apiKey
                },
                body: JSON.stringify({
                    url: webhookUrl,
                    enabled: true
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao configurar webhook:', error);
            throw error;
        }
    }
}

// Inicializar API da Evolution
const evolutionAPI = new EvolutionAPI(CONFIG.EVOLUTION_API_URL, CONFIG.EVOLUTION_API_KEY);