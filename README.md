# MAC0623 — Docking em Realidade Aumentada

Aplicação WebXR desenvolvida para o trabalho A4 da disciplina MAC0623. O projeto
investiga a interação com objetos virtuais em realidade aumentada, comparando duas
técnicas para posicionar e encaixar um objeto no alvo correto.

## Técnicas de interação

### Touch

O objeto é selecionado e manipulado diretamente na tela:

- arraste com um dedo para mover;
- use dois dedos para girar;
- toque no objeto correspondente à cor do alvo para iniciar a tarefa.

### Custom Carry

O objeto é manipulado como se estivesse sendo carregado no espaço:

- mantenha pressionado o botão **Segurar**;
- mova o celular para transportar o objeto;
- use o joystick na tela para controlar a rotação.

## Funcionamento do experimento

1. Informe o identificador do participante e a condição inicial.
2. Entre na sessão de realidade aumentada.
3. Encontre uma superfície e posicione o espaço de trabalho.
4. Selecione o objeto solicitado e encaixe-o no alvo.
5. Ao final de cada tentativa, informe o nível de cansaço dos braços.

As tentativas seguem uma ordem experimental ABBA, alternando as duas técnicas para
reduzir efeitos de ordem. Também é possível ativar o modo **Treino**, que permite
praticar sem registrar uma tentativa experimental.

Durante cada tentativa, o sistema acompanha o tempo de execução, os erros de seleção,
a distância até o alvo e o erro de rotação. Os resultados podem ser exportados em CSV
pela tela inicial.

## Requisitos

- dispositivo Android compatível com ARCore;
- navegador com suporte a WebXR, como Chrome;
- acesso via HTTPS;
- câmera e sensores de movimento habilitados.

## Estrutura do projeto

- `index.html`: interface de preparação e overlay da sessão AR;
- `src/`: lógica de posicionamento, interação, técnicas e métricas;
- `a4.css`: estilos da aplicação.

Os dados são armazenados localmente no navegador. Use **Baixar CSV** para exportá-los
ou **Apagar dados do CSV** para limpar os registros salvos.
