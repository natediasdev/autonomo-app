# AutônomoApp

> Agenda inteligente para profissionais autônomos — organize clientes, visitas e financeiro em um único lugar.

![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![PWA](https://img.shields.io/badge/PWA-instalável-E8FF47?style=flat-square)

---

## Sobre

AutônomoApp é uma **Progressive Web App (PWA)** mobile-first desenvolvida para autônomos que precisam organizar sua agenda de clientes sem depender de planilhas, papéis ou múltiplas ferramentas. Funciona 100% offline, é instalável direto do navegador Android ou iOS, e todos os dados ficam salvos no próprio dispositivo.

O projeto nasceu como solução pessoal e foi construído com foco em **simplicidade de uso no celular**, design polido e zero infraestrutura em nuvem.

---

## Funcionalidades

### Agenda
- Visualização semanal com navegação entre semanas
- Agendamento automático baseado na frequência de cada cliente (semanal, quinzenal ou mensal)
- Dia fixo da semana por cliente com possibilidade de mover visitas individualmente
- Marcar visitas como concluídas
- Observações por visita (salvas para a próxima vez)
- Confirmação rápida via WhatsApp com mensagem pré-preenchida
- Resumo financeiro da semana atual no topo

### Clientes
- Cadastro com nome, telefone, mensalidade, frequência e dia preferido
- Indicador visual de inadimplência
- Acesso rápido ao financeiro e edição de cada cliente
- Próxima visita exibida na listagem

### Financeiro
- Valor de mensalidade fixo por cliente
- Lançamento manual de pagamentos com data e observação
- Saldo devedor calculado automaticamente
- Barra de progresso de recebimento
- Histórico de pagamentos por cliente

### Relatório Mensal
- Previsto, recebido e pendente do mês
- Total de limpezas realizadas
- Alerta de inadimplentes com valores
- Breakdown por cliente
- Compartilhamento via share nativo do Android ou cópia para clipboard

---

## Stack

| Tecnologia | Uso |
|---|---|
| React 18 + Vite 6 | Frontend e bundler |
| React Router v6 | Navegação SPA |
| Framer Motion | Animações e transições |
| date-fns | Manipulação de datas |
| vite-plugin-pwa | Service worker e manifest |
| localStorage | Persistência de dados offline |

**Fontes:** Syne (display), DM Sans (corpo), Space Grotesk (números)

---

## Rodando localmente

```bash
# Clone o repositório
git clone https://github.com/natediasdev/autonomo-app.git
cd autonomo-app

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` no navegador.

Para testar no celular na mesma rede Wi-Fi, acesse `http://[seu-ip-local]:5173`.

---

## Build e deploy

```bash
# Gerar build de produção
npm run build

# Prévia local do build
npm run preview
```

O deploy para GitHub Pages é feito automaticamente via GitHub Actions a cada push na branch `master`. O workflow está em `.github/workflows/deploy.yml`.

---

## Instalação como app (PWA)

**Android:** Abra o site no Chrome → menu `⋮` → *Adicionar à tela inicial*

**iOS:** Abra no Safari → botão compartilhar → *Adicionar à tela de início*

Para gerar um APK nativo via TWA (Trusted Web Activity):
1. Faça o deploy em uma URL com HTTPS
2. Acesse [pwabuilder.com](https://pwabuilder.com) e cole a URL
3. Baixe o pacote Android e instale o APK

---

## Estrutura do projeto

```
autonomo-app/
├── public/               # Ícones PWA e assets estáticos
├── src/
│   ├── components/       # Layout, AppHeader, ClientForm, Skeleton
│   ├── hooks/            # useAndroidBack, useCountUp
│   ├── pages/            # Agenda, Clientes, Financeiro, Relatorio
│   └── utils/
│       └── data.js       # Toda a lógica de dados e localStorage
├── .github/workflows/    # Deploy automático para GitHub Pages
└── vite.config.js        # Config Vite + PWA
```

---

## Licença

MIT — use, modifique e distribua livremente.
