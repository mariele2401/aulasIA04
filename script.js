let conversas = [];
let conversaAtualId = null;
let mensagens = [];

const chat = document.getElementById('chat');
const containerPrincipal = document.querySelector('.container-principal');
const boasVindas = document.getElementById('boas-vindas');
const form = document.getElementById('form');
const pergunta = document.getElementById('pergunta');
const enviar = document.getElementById('enviar');
const listaHistorico = document.getElementById('lista-historico');

function rolarParaBaixo() {
  containerPrincipal.scrollTop = containerPrincipal.scrollHeight;
}

function mostrar(classe, texto) {
  if (boasVindas) {
    boasVindas.style.display = 'none';
  }
  const div = document.createElement('div');
  div.className = classe;
  div.textContent = texto;
  chat.appendChild(div);
  rolarParaBaixo();
  return div;
}

function renderizarHistorico() {
  listaHistorico.innerHTML = '';
  conversas.forEach((conv) => {
    const li = document.createElement('li');
    li.className = 'item-historico' + (conv.id === conversaAtualId ? ' ativo' : '');
    li.textContent = conv.titulo;
    li.title = conv.titulo;
    li.addEventListener('click', () => carregarConversa(conv.id));
    listaHistorico.appendChild(li);
  });
}

function carregarConversa(id) {
  const conv = conversas.find((c) => c.id === id);
  if (!conv) return;

  conversaAtualId = conv.id;
  mensagens = [...conv.mensagens];
  chat.innerHTML = '';

  if (mensagens.length === 0 && boasVindas) {
    boasVindas.style.display = 'block';
    chat.appendChild(boasVindas);
  } else {
    mensagens.forEach((m) => {
      mostrar(m.role === 'user' ? 'msg user' : 'msg assistant', m.content);
    });
  }
  renderizarHistorico();
}

function iniciarNovoChat() {
  conversaAtualId = null;
  mensagens = [];
  chat.innerHTML = '';
  if (boasVindas) {
    boasVindas.style.display = 'block';
    chat.appendChild(boasVindas);
  }
  renderizarHistorico();
  pergunta.focus();
}

// Tenta criar uma conversa no servidor se existir rota de criação (Aula 04)
async function criarConversaNoServidor() {
  const rotas = ['/conversas', '/nova', '/conversa'];
  for (const rota of rotas) {
    try {
      const res = await fetch(rota, { method: 'POST' });
      if (res.ok) {
        const dados = await res.json();
        return dados.id || dados.conversa || dados.conversaId || null;
      }
    } catch (_) {
      // ignora se a rota não existir
    }
  }
  return null;
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const texto = pergunta.value.trim();
  if (!texto) return;

  mostrar('msg user', texto);
  pergunta.value = '';
  enviar.disabled = true;
  const balao = mostrar('msg assistant', 'Pensando...');

  try {
    if (!conversaAtualId) {
      const idServidor = await criarConversaNoServidor();
      conversaAtualId = idServidor || ('conv_' + Date.now());
      conversas.unshift({
        id: conversaAtualId,
        titulo: texto,
        mensagens: []
      });
    }

    const convAtual = conversas.find((c) => c.id === conversaAtualId);

    // Envia no formato da Aula 04: { conversa, texto }
    const resposta = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversa: conversaAtualId,
        texto: texto
      })
    });

    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Erro no servidor');

    if (dados.conversa && dados.conversa !== conversaAtualId) {
      conversaAtualId = dados.conversa;
      if (convAtual) convAtual.id = dados.conversa;
    }

    mensagens.push({ role: 'user', content: texto });
    mensagens.push({ role: 'assistant', content: dados.resposta });
    if (convAtual) convAtual.mensagens = [...mensagens];
    renderizarHistorico();

    balao.textContent = dados.resposta;
    rolarParaBaixo();

    if (dados.ferramentas && dados.ferramentas.length > 0) {
      mostrar('ferramentas', 'Consultou: ' + dados.ferramentas.join(', '));
    }
  } catch (erro) {
    balao.textContent = 'Erro: ' + erro.message;
  }

  enviar.disabled = false;
  pergunta.focus();
});

// Controle da flechinha e do menu do topo
const btnModelo = document.getElementById('btn-modelo');
const menuModelo = document.getElementById('menu-modelo');
const btnLimparChat = document.getElementById('btn-limpar-chat');

btnModelo.addEventListener('click', (e) => {
  e.stopPropagation();
  const aberto = menuModelo.classList.toggle('visivel');
  btnModelo.classList.toggle('aberto', aberto);
  btnModelo.setAttribute('aria-expanded', aberto);
});

document.addEventListener('click', () => {
  menuModelo.classList.remove('visivel');
  btnModelo.classList.remove('aberto');
  btnModelo.setAttribute('aria-expanded', 'false');
});

btnLimparChat.addEventListener('click', iniciarNovoChat);

// Abrir e fechar barra lateral
const sidebar = document.getElementById('sidebar');
const btnFecharSidebar = document.getElementById('btn-fechar-sidebar');
const btnAbrirSidebar = document.getElementById('btn-abrir-sidebar');
const btnNovoChat = document.getElementById('btn-novo-chat');

btnFecharSidebar.addEventListener('click', () => {
  sidebar.classList.add('fechada');
  btnAbrirSidebar.classList.remove('oculto');
});

btnAbrirSidebar.addEventListener('click', () => {
  sidebar.classList.remove('fechada');
  btnAbrirSidebar.classList.add('oculto');
});

btnNovoChat.addEventListener('click', iniciarNovoChat);