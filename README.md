# MAC0623 — Docking em AR

Experimento WebXR para comparar duas técnicas de encaixe de objetos em realidade aumentada:
**Touch** e **Custom Carry**.

## Publicar no GitHub Pages

1. Envie este repositório para o GitHub.
2. Em **Settings → Pages**, selecione **Deploy from a branch**.
3. Escolha a branch principal e a pasta `/ (root)`.
4. Abra a URL publicada em um celular Android compatível com ARCore.

O GitHub Pages fornece HTTPS, requisito para o WebXR.

## Executar localmente

Sirva a pasta por **HTTPS** e abra `index.html` em um dispositivo Android compatível
com ARCore e WebXR (por exemplo, Chrome).

```bash
python3 -m http.server 8000
```

Para uso no celular, prefira um servidor HTTPS. Preencha o participante, entre no AR e
execute as tentativas. Ao final, baixe os resultados em CSV.

## Estrutura

- `index.html`: interface e entrada no AR
- `src/`: lógica da sessão, interação e métricas
- `a4.css`: estilos da interface

Os dados ficam armazenados localmente no navegador e podem ser apagados pelo botão
**Apagar dados do CSV**.
