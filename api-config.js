// api-config.js - Configuração e diagnósticos da API
const APIConfig = {
    // Configurações da Evolution API
    config: {
        baseUrl: 'https://promptaaievo.discloud.app',
        apiKey: 'B6D711FCDE4D4FD5936544120E713976', // Substitua pela sua chave real
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 2000
    },
    
    // Endpoints disponíveis
    endpoints: {
        // Gerenciamento de instâncias
        createInstance: '/manager/instance',
        deleteInstance: '/manager/instance/delete/{instanceName}',
        fetchInstances: '/manager/fetchInstances',
        instanceStatus: '/manager/instance/connectionState/{instanceName}',
        connect: '/manager/instance/connect/{instanceName}',
        disconnect: '/manager/instance/logout/{instanceName}',
        restart: '/manager/instance/restart/{instanceName}',
        
        // Webhooks
        setWebhook: '/manager/instance/webhook/{instanceName}',
        
        // Mensagens
        sendText: '/message/sendText/{instanceName}',
        sendMedia: '/message/sendMedia/{instanceName}',
        
        // Profile
        fetchProfile: '/manager/instance/fetchProfile/{instanceName}'
    },
    
    // Testar conectividade básica
    async testBasicConnectivity() {
        const results = {
            domain: false,
            ssl: false,
            cors: false,
            api: false,
            auth: false
        };
        
        try {
            console.log('🔍 Testando conectividade básica...');
            
            // Teste 1: DNS/Domain resolution
            try {
                const response = await fetch(this.config.baseUrl, { 
                    method: 'HEAD', 
                    mode: 'no-cors',
                    signal: AbortSignal.timeout(10000)
                });
                results.domain = true;
                console.log('✅ Domain acessível');
            } catch (error) {
                console.error('❌ Domain inacessível:', error);
                results.domain = false;
            }
            
            // Teste 2: SSL/HTTPS
            if (this.config.baseUrl.startsWith('https://')) {
                results.ssl = true;
                console.log('✅ SSL configurado');
            } else {
                console.warn('⚠️ SSL não configurado');
                results.ssl = false;
            }
            
            // Teste 3: CORS
            try {
                const response = await fetch(this.config.baseUrl, {
                    method: 'OPTIONS',
                    headers: {
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'apikey'
                    }
                });
                results.cors = response.ok;
                console.log('✅ CORS configurado');
            } catch (error) {
                console.warn('⚠️ CORS pode estar bloqueado:', error);
                results.cors = false;
            }
            
            // Teste 4: API básica
            try {
                const response = await fetch(`${this.config.baseUrl}/manager/fetchInstances`, {
                    method: 'GET',
                    headers: {
                        'apikey': this.config.apiKey,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(15000)
                });
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    results.api = true;
                    console.log('✅ API respondendo com JSON');
                } else {
                    results.api = false;
                    console.error('❌ API retornando HTML:', await response.text());
                }
            } catch (error) {
                console.error('❌ API não acessível:', error);
                results.api = false;
            }
            
            // Teste 5: Autenticação
            if (results.api) {
                try {
                    const response = await fetch(`${this.config.baseUrl}/manager/fetchInstances`, {
                        method: 'GET',
                        headers: {
                            'apikey': this.config.apiKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        results.auth = true;
                        console.log('✅ Autenticação OK');
                    } else if (response.status === 401 || response.status === 403) {
                        results.auth = false;
                        console.error('❌ Erro de autenticação - verifique a API key');
                    }
                } catch (error) {
                    console.error('❌ Erro ao testar autenticação:', error);
                    results.auth = false;
                }
            }
            
        } catch (error) {
            console.error('Erro geral nos testes:', error);
        }
        
        return results;
    },
    
    // Diagnosticar problemas específicos
    async diagnoseProblem(error) {
        const diagnosis = {
            problem: 'unknown',
            solution: 'Erro desconhecido',
            severity: 'medium'
        };
        
        const errorMessage = error.message || error.toString();
        
        if (errorMessage.includes('<!doctype') || errorMessage.includes('<html>')) {
            diagnosis.problem = 'html_response';
            diagnosis.solution = 'A API está retornando HTML ao invés de JSON. Possíveis causas:\n' +
                                '• URL base incorreta\n' +
                                '• API key inválida\n' +
                                '• Servidor retornando página de erro\n' +
                                '• Proxy ou CDN interceptando requisições';
            diagnosis.severity = 'high';
        }
        else if (errorMessage.includes('404')) {
            diagnosis.problem = 'endpoint_not_found';
            diagnosis.solution = 'Endpoint não encontrado. Verifique:\n' +
                                '• URL base está correta\n' +
                                '• Endpoint existe na documentação da API\n' +
                                '• Versão da API está atualizada';
            diagnosis.severity = 'high';
        }
        else if (errorMessage.includes('401') || errorMessage.includes('403')) {
            diagnosis.problem = 'auth_error';
            diagnosis.solution = 'Erro de autenticação. Verifique:\n' +
                                '• API key está correta\n' +
                                '• API key tem as permissões necessárias\n' +
                                '• API key não expirou';
            diagnosis.severity = 'high';
        }
        else if (errorMessage.includes('CORS')) {
            diagnosis.problem = 'cors_error';
            diagnosis.solution = 'Erro de CORS. Possíveis soluções:\n' +
                                '• Configurar CORS no servidor da API\n' +
                                '• Usar proxy para contornar CORS\n' +
                                '• Executar aplicação no mesmo domínio da API';
            diagnosis.severity = 'medium';
        }
        else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            diagnosis.problem = 'network_error';
            diagnosis.solution = 'Problema de rede. Tente:\n' +
                                '• Verificar conexão com internet\n' +
                                '• Aumentar timeout da requisição\n' +
                                '• Verificar se o servidor está online';
            diagnosis.severity = 'medium';
        }
        else if (errorMessage.includes('500')) {
            diagnosis.problem = 'server_error';
            diagnosis.solution = 'Erro interno do servidor. Aguarde ou:\n' +
                                '• Contate o administrador da API\n' +
                                '• Verifique logs do servidor se possível\n' +
                                '• Tente novamente em alguns minutos';
            diagnosis.severity = 'low';
        }
        
        return diagnosis;
    },
    
    // Sugerir configurações alternativas
    async suggestAlternativeConfigs() {
        const suggestions = [];
        
        // Testar URLs alternativas
        const alternativeUrls = [
            'https://promptaaievo.discloud.app/api',
            'https://promptaaievo.discloud.app/v1',
            'https://api.promptaaievo.discloud.app',
            'http://promptaaievo.discloud.app' // fallback para HTTP
        ];
        
        for (const url of alternativeUrls) {
            if (url === this.config.baseUrl) continue;
            
            try {
                const response = await fetch(`${url}/manager/fetchInstances`, {
                    method: 'GET',
                    headers: {
                        'apikey': this.config.apiKey,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(5000)
                });
                
                if (response.ok) {
                    suggestions.push({
                        type: 'url',
                        current: this.config.baseUrl,
                        suggested: url,
                        reason: 'Esta URL responde corretamente'
                    });
                }
            } catch (error) {
                // Ignorar erros
            }
        }
        
        // Sugerir headers alternativos
        const alternativeHeaders = [
            { 'Authorization': `Bearer ${this.config.apiKey}` },
            { 'x-api-key': this.config.apiKey },
            { 'api_key': this.config.apiKey }
        ];
        
        for (const headers of alternativeHeaders) {
            try {
                const response = await fetch(`${this.config.baseUrl}/manager/fetchInstances`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    signal: AbortSignal.timeout(5000)
                });
                
                if (response.ok) {
                    suggestions.push({
                        type: 'auth',
                        current: 'apikey header',
                        suggested: Object.keys(headers)[0],
                        reason: 'Este método de autenticação funciona'
                    });
                    break;
                }
            } catch (error) {
                // Ignorar erros
            }
        }
        
        return suggestions;
    },
    
    // Gerar relatório completo de diagnóstico
    async generateDiagnosticReport() {
        console.log('📊 Gerando relatório de diagnóstico...');
        
        const report = {
            timestamp: new Date().toISOString(),
            config: this.config,
            connectivity: await this.testBasicConnectivity(),
            suggestions: await this.suggestAlternativeConfigs(),
            systemInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            }
        };
        
        // Calcular score geral
        const connectivityTests = Object.values(report.connectivity);
        const passedTests = connectivityTests.filter(test => test === true).length;
        report.healthScore = Math.round((passedTests / connectivityTests.length) * 100);
        
        console.log('📊 Relatório de diagnóstico gerado:', report);
        return report;
    },
    
    // Exibir relatório na interface
    displayDiagnosticReport(report) {
        const diagnosticHtml = `
            <div class="diagnostic-report">
                <h3>📊 Relatório de Diagnóstico</h3>
                <div class="health-score">
                    <h4>Score de Conectividade: ${report.healthScore}%</h4>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${report.healthScore}%"></div>
                    </div>
                </div>
                
                <div class="connectivity-tests">
                    <h4>Testes de Conectividade</h4>
                    <ul>
                        <li class="${report.connectivity.domain ? 'pass' : 'fail'}">
                            ${report.connectivity.domain ? '✅' : '❌'} Domain/DNS
                        </li>
                        <li class="${report.connectivity.ssl ? 'pass' : 'fail'}">
                            ${report.connectivity.ssl ? '✅' : '❌'} SSL/HTTPS
                        </li>
                        <li class="${report.connectivity.cors ? 'pass' : 'fail'}">
                            ${report.connectivity.cors ? '✅' : '❌'} CORS
                        </li>
                        <li class="${report.connectivity.api ? 'pass' : 'fail'}">
                            ${report.connectivity.api ? '✅' : '❌'} API Response
                        </li>
                        <li class="${report.connectivity.auth ? 'pass' : 'fail'}">
                            ${report.connectivity.auth ? '✅' : '❌'} Authentication
                        </li>
                    </ul>
                </div>
                
                ${report.suggestions.length > 0 ? `
                    <div class="suggestions">
                        <h4>Sugestões de Configuração</h4>
                        <ul>
                            ${report.suggestions.map(s => `
                                <li>
                                    <strong>${s.type}:</strong> ${s.suggested}
                                    <br><small>${s.reason}</small>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="current-config">
                    <h4>Configuração Atual</h4>
                    <pre>${JSON.stringify(report.config, null, 2)}</pre>
                </div>
            </div>
        `;
        
        // Adicionar à página se existir container
        const container = document.getElementById('diagnosticContainer');
        if (container) {
            container.innerHTML = diagnosticHtml;
        } else {
            console.log('HTML do diagnóstico:', diagnosticHtml);
        }
    }
};

// Função para executar diagnóstico completo
async function runFullDiagnostic() {
    try {
        Utils.showToast('Executando diagnóstico...', 'info');
        
        const report = await APIConfig.generateDiagnosticReport();
        APIConfig.displayDiagnosticReport(report);
        
        if (report.healthScore < 50) {
            Utils.showToast('Problemas de conectividade detectados. Verifique o relatório.', 'error');
        } else if (report.healthScore < 80) {
            Utils.showToast('Alguns problemas encontrados. Configuração pode ser melhorada.', 'warning');
        } else {
            Utils.showToast('Conectividade OK!', 'success');
        }
        
        return report;
    } catch (error) {
        console.error('Erro ao executar diagnóstico:', error);
        Utils.showToast('Erro ao executar diagnóstico', 'error');
        return null;
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIConfig, runFullDiagnostic };
} else {
    window.APIConfig = APIConfig;
    window.runFullDiagnostic = runFullDiagnostic;
}